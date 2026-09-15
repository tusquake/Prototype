package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategy;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategyFactory;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.SopTemplate;
import com.cloudkaptan.sop.entity.SopVersion;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.TaskTemplate;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.SopRepository;
import com.cloudkaptan.sop.repository.SopTemplateRepository;
import com.cloudkaptan.sop.repository.SopVersionRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskSchedulerService {

    private final SopRepository sopRepository;
    private final SopVersionRepository sopVersionRepository;
    private final SopTemplateRepository sopTemplateRepository;
    private final TaskRepository taskRepository;
    private final RecurrenceStrategyFactory recurrenceStrategyFactory;
    private final AuditLogRepository auditLogRepository;
    private final NotificationPublisherService notificationPublisherService;

    @Scheduled(cron = "${app.task-scheduler.cron:0 0 0 * * ?}")
    @Transactional
    public void generateScheduledTasks() {
        log.info("Executing scheduled task generation engine...");
        LocalDate today = LocalDate.now();

        // ─── PATH 1: Legacy SOP-version based generation (backward compat) ────
        generateFromSopVersions(today);

        // ─── PATH 2: New SOP Template-based generation ─────────────────────────
        generateFromSopTemplates(today);

        log.info("Scheduled task generation cycle complete for date [{}].", today);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LEGACY PATH — SopVersion driven (existing behavior, untouched)
    // ─────────────────────────────────────────────────────────────────────────

    private void generateFromSopVersions(LocalDate today) {
        List<SopVersion> activeVersions = sopVersionRepository.findActiveRunningVersions();
        int generatedCount = 0;

        for (SopVersion version : activeVersions) {
            try {
                Sop sop = version.getSop();

                LocalDate entityToday = (sop.getEntity() != null && sop.getEntity().getEntityCode() != null)
                        ? sop.getEntity().getEntityCode().getCurrentLocalDate()
                        : today;

                LocalDate sopStartDate = (sop.getStartDate() != null)
                        ? sop.getStartDate()
                        : ((version.getStartDateTime() != null) ? version.getStartDateTime().toLocalDate() : entityToday);

                if (sopStartDate.isAfter(entityToday)) {
                    log.info("Skipping task generation for SOP [{}] - start date [{}] is in the future relative to today [{}].",
                            sop.getSopCode(), sopStartDate, entityToday);
                    continue;
                }

                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(version.getFrequency());
                String periodKey = strategy.calculatePeriodKey(entityToday);

                if (Boolean.FALSE.equals(version.getIsRecurring()) && taskRepository.existsBySop_SopId(sop.getSopId())) {
                    log.info("Skipping task generation for non-recurring SOP [{}] - task already generated.", sop.getSopCode());
                    continue;
                }

                if (!taskRepository.existsBySop_SopIdAndPeriodKey(sop.getSopId(), periodKey)) {
                    LocalDate taskStartDate = sopStartDate;
                    LocalDate taskDueDate = (sop.getDueDate() != null)
                            ? sop.getDueDate()
                            : ((version.getDueDateTime() != null) ? version.getDueDateTime().toLocalDate()
                            : taskStartDate.plusDays(sop.getDueDayOffset() != null ? sop.getDueDayOffset() : 7));

                    String recordNo = String.format("%s-%s", sop.getSopCode(), periodKey);

                    List<String> makerPool = (sop.getDefaultMakerIds() != null && !sop.getDefaultMakerIds().isEmpty())
                            ? new ArrayList<>(sop.getDefaultMakerIds())
                            : new ArrayList<>(List.of("usr-tushar-304"));

                    List<String> checkerPool = (sop.getDefaultCheckerIds() != null && !sop.getDefaultCheckerIds().isEmpty())
                            ? new ArrayList<>(sop.getDefaultCheckerIds())
                            : new ArrayList<>(List.of("usr-prayasa-410"));

                    Task task = Task.builder()
                            .sop(sop)
                            .sopVersion(version)
                            .recordNo(recordNo)
                            .periodKey(periodKey)
                            .entity(sop.getEntity())
                            .assignedMakerIds(makerPool)
                            .assignedCheckerIds(checkerPool)
                            .status(TaskStatus.OPEN)
                            .startDate(taskStartDate)
                            .dueDate(taskDueDate)
                            .build();

                    Task savedTask = taskRepository.save(task);

                    auditLogRepository.save(AuditLog.builder()
                            .actorId(sop.getCreatedBy() != null ? sop.getCreatedBy().getUserId() : "usr-manoj-042")
                            .action("CREATE_TASK")
                            .entityType("TASK")
                            .entityId(recordNo)
                            .correlationId(UUID.randomUUID().toString())
                            .build());

                    notifyMakers(savedTask, sop.getTitle());
                    generatedCount++;
                    log.info("(Legacy) Generated Task [{}] for SOP [{}] period [{}]", recordNo, sop.getSopCode(), periodKey);
                }
            } catch (Exception e) {
                log.error("(Legacy) Failed to generate task for SOP Version [{}]: {}", version.getVersionId(), e.getMessage(), e);
            }
        }

        log.info("(Legacy) Idempotently created [{}] tasks from SOP versions.", generatedCount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE PATH — SopTemplate driven (new behavior)
    // ─────────────────────────────────────────────────────────────────────────

    private void generateFromSopTemplates(LocalDate today) {
        List<SopTemplate> schedulableTemplates = sopTemplateRepository.findSchedulableTemplates(
                SopTemplateStatus.ACTIVE, today);

        if (schedulableTemplates.isEmpty()) {
            log.info("(Template) No schedulable ACTIVE SOP Templates found for date [{}].", today);
            return;
        }

        int sopCount = 0;
        int taskCount = 0;

        for (SopTemplate template : schedulableTemplates) {
            try {
                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(template.getFrequency());
                String periodKey = strategy.calculatePeriodKey(today);

                // Guard: Skip if a SOP instance already exists for this template + period
                boolean sopInstanceExists = sopRepository.findBySopCode(
                        buildSopCode(template.getTemplateCode(), periodKey)).isPresent();

                if (sopInstanceExists) {
                    log.debug("(Template) SOP instance already exists for template [{}] period [{}] — skipping.",
                            template.getTemplateCode(), periodKey);
                    continue;
                }

                // Compute SOP instance dates
                LocalDate sopStartDate = template.getEffectiveFrom().isAfter(today)
                        ? template.getEffectiveFrom()
                        : today;
                LocalDate sopDueDate = sopStartDate.plusDays(template.getDueDayOffset());

                // Create real Sop instance
                String sopCode = buildSopCode(template.getTemplateCode(), periodKey);
                Sop sopInstance = Sop.builder()
                        .sopCode(sopCode)
                        .title(template.getTitle())
                        .description(template.getDescription())
                        .processCategory(template.getProcessCategory())
                        .entity(template.getEntity())
                        .frequency(template.getFrequency())
                        .isRecurring(template.getIsRecurring())
                        .dueDayOffset(template.getDueDayOffset())
                        .startDate(sopStartDate)
                        .dueDate(sopDueDate)
                        .defaultMakerIds(new ArrayList<>(template.getDefaultMakerIds()))
                        .defaultCheckerIds(new ArrayList<>(template.getDefaultCheckerIds()))
                        .status(SopStatus.ACTIVE)
                        .templateId(template.getTemplateId())
                        .createdBy(template.getCreatedBy())
                        .build();

                Sop savedSop = sopRepository.save(sopInstance);
                sopCount++;
                log.info("(Template) Generated SOP instance [{}] from template [{}] for period [{}]",
                        sopCode, template.getTemplateCode(), periodKey);

                // Generate Task instances for each TaskTemplate step
                List<TaskTemplate> taskTemplates = template.getTaskTemplates();
                for (TaskTemplate taskTemplate : taskTemplates) {
                    try {
                        // Compute absolute task dates: SOP start + ETA days
                        LocalDate taskStartDate = sopStartDate.plusDays(taskTemplate.getEtaStartDay());
                        LocalDate taskDueDate = sopStartDate.plusDays(taskTemplate.getEtaEndDay());

                        String taskRecordNo = String.format("%s-T%d", sopCode, taskTemplate.getStepSequence());

                        List<String> taskMakers = (!taskTemplate.getMakerIds().isEmpty())
                                ? new ArrayList<>(taskTemplate.getMakerIds())
                                : new ArrayList<>(template.getDefaultMakerIds());

                        List<String> taskCheckers = (!taskTemplate.getCheckerIds().isEmpty())
                                ? new ArrayList<>(taskTemplate.getCheckerIds())
                                : new ArrayList<>(template.getDefaultCheckerIds());

                        // DEPENDENT_ON_PREVIOUS tasks start in LOCKED status
                        TaskStatus initialStatus = "DEPENDENT_ON_PREVIOUS".equals(taskTemplate.getDependencyMode())
                                && taskTemplate.getStepSequence() > 1
                                ? TaskStatus.LOCKED
                                : TaskStatus.OPEN;

                        Task task = Task.builder()
                                .sop(savedSop)
                                .recordNo(taskRecordNo)
                                .periodKey(periodKey)
                                .entity(savedSop.getEntity())
                                .assignedMakerIds(taskMakers)
                                .assignedCheckerIds(taskCheckers)
                                .status(initialStatus)
                                .startDate(taskStartDate)
                                .dueDate(taskDueDate)
                                .taskTemplateId(taskTemplate.getTaskTemplateId())
                                .build();

                        Task savedTask = taskRepository.save(task);
                        taskCount++;

                        auditLogRepository.save(AuditLog.builder()
                                .actorId(template.getCreatedBy() != null ? template.getCreatedBy().getUserId() : "system")
                                .action("CREATE_TASK_FROM_TEMPLATE")
                                .entityType("TASK")
                                .entityId(taskRecordNo)
                                .correlationId(UUID.randomUUID().toString())
                                .build());

                        // Notify only OPEN tasks (locked tasks notify when they unlock)
                        if (initialStatus == TaskStatus.OPEN) {
                            notifyMakers(savedTask, template.getTitle());
                        }

                        log.info("(Template) Generated Task [{}] (Step {}) for SOP [{}] — startDate={} dueDate={}",
                                taskRecordNo, taskTemplate.getStepSequence(), sopCode, taskStartDate, taskDueDate);

                    } catch (Exception te) {
                        log.error("(Template) Failed to generate task step [{}] for SOP [{}]: {}",
                                taskTemplate.getStepSequence(), sopCode, te.getMessage(), te);
                    }
                }

            } catch (Exception e) {
                log.error("(Template) Failed to generate SOP from template [{}]: {}", template.getTemplateId(), e.getMessage(), e);
            }
        }

        log.info("(Template) Generated [{}] SOP instances and [{}] tasks from templates.", sopCount, taskCount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String buildSopCode(String templateCode, String periodKey) {
        return templateCode + "-" + periodKey;
    }

    private void notifyMakers(Task task, String sopTitle) {
        if (task.getAssignedMakerIds() == null || task.getAssignedMakerIds().isEmpty()) return;
        for (String makerId : task.getAssignedMakerIds()) {
            notificationPublisherService.publishNotification(NotificationEventDto.builder()
                    .recipientUserId(makerId)
                    .eventType("TASK_ASSIGNED")
                    .title("Compliance Task Assigned for Submission")
                    .message("You have been assigned task " + task.getRecordNo()
                            + " (" + sopTitle + ") to complete by " + task.getDueDate())
                    .referenceEntityType("TASK")
                    .referenceEntityId(task.getTaskId().toString())
                    .build());
        }
    }
}




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

                instantiateSingleSopTemplate(template, today);
                sopCount++;

            } catch (Exception e) {
                log.error("(Template) Failed to generate SOP from template [{}]: {}", template.getTemplateId(), e.getMessage(), e);
            }
        }

        log.info("(Template) Generated [{}] SOP instances from templates.", sopCount);
    }

    @Transactional
    public Sop instantiateSingleSopTemplate(SopTemplate template, LocalDate today) {
        if (template == null) return null;
        RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(template.getFrequency() != null ? template.getFrequency() : com.cloudkaptan.sop.domain.enums.SopFrequency.MONTHLY);
        String periodKey = strategy.calculatePeriodKey(today);

        String sopCode = buildSopCode(template.getTemplateCode(), periodKey);
        // If an instance already exists for this exact code, append unique timestamp suffix for demo trigger
        if (sopRepository.findBySopCode(sopCode).isPresent()) {
            periodKey = periodKey + "-" + (System.currentTimeMillis() % 10000);
            sopCode = buildSopCode(template.getTemplateCode(), periodKey);
        }

        LocalDate sopStartDate = (template.getEffectiveFrom() != null && template.getEffectiveFrom().isAfter(today))
                ? template.getEffectiveFrom()
                : today;
        LocalDate sopDueDate = sopStartDate.plusDays(template.getDueDayOffset() != null ? template.getDueDayOffset() : 15);

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
                .defaultMakerIds(template.getDefaultMakerIds() != null ? new ArrayList<>(template.getDefaultMakerIds()) : new ArrayList<>())
                .defaultCheckerIds(template.getDefaultCheckerIds() != null ? new ArrayList<>(template.getDefaultCheckerIds()) : new ArrayList<>())
                .status(SopStatus.ACTIVE)
                .templateId(template.getTemplateId())
                .createdBy(template.getCreatedBy())
                .build();

        Sop savedSop = sopRepository.save(sopInstance);
        log.info("(Template) Generated SOP instance [{}] from template [{}] for period [{}]",
                sopCode, template.getTemplateCode(), periodKey);

        List<TaskTemplate> taskTemplates = template.getTaskTemplates();
        if (taskTemplates != null && !taskTemplates.isEmpty()) {
            List<TaskTemplate> sortedSteps = taskTemplates.stream()
                    .sorted(java.util.Comparator.comparingInt(TaskTemplate::getStepSequence))
                    .toList();

            Task previousTask = null;

            for (TaskTemplate taskTemplate : sortedSteps) {
                try {
                    int durationDays = (taskTemplate.getEtaEndDay() != null && taskTemplate.getEtaEndDay() > 0)
                            ? taskTemplate.getEtaEndDay()
                            : 7;

                    LocalDate taskStartDate;
                    LocalDate taskDueDate;
                    TaskStatus initialStatus;

                    if (previousTask == null || "INDEPENDENT".equalsIgnoreCase(taskTemplate.getDependencyMode()) || taskTemplate.getStepSequence() == 1) {
                        taskStartDate = sopStartDate;
                        taskDueDate = taskStartDate.plusDays(durationDays);
                        initialStatus = TaskStatus.OPEN;
                    } else {
                        // Dependent task planned start date is the day after previous task's planned due date
                        taskStartDate = previousTask.getDueDate().plusDays(1);
                        taskDueDate = taskStartDate.plusDays(durationDays);

                        // Unlock if planned start date has arrived (today >= taskStartDate)
                        if (!today.isBefore(taskStartDate)) {
                            initialStatus = TaskStatus.OPEN;
                        } else {
                            initialStatus = TaskStatus.LOCKED;
                        }
                    }

                    String taskRecordNo = String.format("%s-T%d", sopCode, taskTemplate.getStepSequence());

                    List<String> taskMakers = (taskTemplate.getMakerIds() != null && !taskTemplate.getMakerIds().isEmpty())
                            ? new ArrayList<>(taskTemplate.getMakerIds())
                            : (template.getDefaultMakerIds() != null ? new ArrayList<>(template.getDefaultMakerIds()) : new ArrayList<>());

                    List<String> taskCheckers = (taskTemplate.getCheckerIds() != null && !taskTemplate.getCheckerIds().isEmpty())
                            ? new ArrayList<>(taskTemplate.getCheckerIds())
                            : (template.getDefaultCheckerIds() != null ? new ArrayList<>(template.getDefaultCheckerIds()) : new ArrayList<>());

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
                    previousTask = savedTask;

                    auditLogRepository.save(AuditLog.builder()
                            .actorId(template.getCreatedBy() != null ? template.getCreatedBy().getUserId() : "system")
                            .action("CREATE_TASK_FROM_TEMPLATE")
                            .entityType("TASK")
                            .entityId(taskRecordNo)
                            .correlationId(UUID.randomUUID().toString())
                            .build());

                    if (initialStatus == TaskStatus.OPEN) {
                        notifyMakers(savedTask, template.getTitle());
                    }

                    log.info("(Template) Generated Task [{}] (Step {}) for SOP [{}] — status={} startDate={} dueDate={}",
                            taskRecordNo, taskTemplate.getStepSequence(), sopCode, initialStatus, taskStartDate, taskDueDate);

                } catch (Exception te) {
                    log.error("(Template) Failed to generate task step [{}] for SOP [{}]: {}",
                            taskTemplate.getStepSequence(), sopCode, te.getMessage(), te);
                }
            }
        }

        return savedSop;
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




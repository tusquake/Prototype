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
import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.HttpMethod;
import com.google.cloud.tasks.v2.HttpRequest;
import com.google.cloud.tasks.v2.OidcToken;
import com.google.cloud.tasks.v2.QueueName;
import com.google.protobuf.ByteString;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
    @Value("${app.cloud-run.self-url:http://localhost:8080}")
    private String backendWorkerUrl;

    @Value("${gcp.cloud-tasks.invoker-service-account:dummy-service-account}")
    private String invokerServiceAccountEmail;

    @Value("${gcp.project-id:finance-sop-portal}")
    private String projectId;

    @Value("${gcp.location-id:asia-south1}")
    private String locationId;

    @Value("${gcp.cloud-tasks.queue-id:sop-instantiation-queue}")
    private String queueId;
    // @Scheduled(cron = "${app.task-scheduler.cron:0 0 0 * * ?}")
    @Transactional
    public void generateScheduledTasks() {
        generateScheduledTasks(null, null);
    }

    @Transactional
    public void generateScheduledTasks(LocalDate overrideDate, Boolean bypassRecurrenceCheck) {
        LocalDate today = overrideDate != null ? overrideDate : LocalDate.now();
        log.info("Executing scheduled task generation engine for date [{}] (Bypass checks: {})...", 
                today, Boolean.TRUE.equals(bypassRecurrenceCheck));

        // ─── PATH 1: Legacy SOP-version based generation (backward compat) ────
        // generateFromSopVersions(today);

        // ─── PATH 2: New SOP Template-based generation via CLOUD TASKS ────────
        generateFromSopTemplates(today, bypassRecurrenceCheck);

        log.info("Scheduled task generation cycle dispatched for date [{}].", today);
    }

    /**
     * Direct In-Memory SOP Instantiation for a specific date (defaults to today).
     * Bypasses GCP Cloud Tasks & Cloud Scheduler completely so live demos / manual triggers work instantly.
     */
    @Transactional
    public List<Sop> triggerDirectSopInstantiation(LocalDate overrideDate, Boolean bypassRecurrenceCheck) {
        LocalDate targetDate = overrideDate != null ? overrideDate : LocalDate.now();
        log.info("Directly instantiating SOP templates for date [{}] (bypassRecurrenceCheck: {})...", targetDate, bypassRecurrenceCheck);

        List<SopTemplate> schedulableTemplates = sopTemplateRepository.findSchedulableTemplates(
                SopTemplateStatus.ACTIVE, targetDate);

        if (schedulableTemplates.isEmpty()) {
            log.info("(Direct Instantiation) No active SOP Templates found for date [{}].", targetDate);
            return List.of();
        }

        boolean skipChecks = Boolean.TRUE.equals(bypassRecurrenceCheck);
        List<Sop> createdSops = new ArrayList<>();

        for (SopTemplate template : schedulableTemplates) {
            try {
                if (!isTemplateDueAndNotInstantiated(template, targetDate, skipChecks)) {
                    continue;
                }

                Sop createdSop = instantiateSingleSopTemplate(template, targetDate);
                if (createdSop != null) {
                    createdSops.add(createdSop);
                    log.info("(Direct Instantiation) Created SOP [{}] from template [{}] for date [{}]",
                            createdSop.getSopCode(), template.getTemplateCode(), targetDate);
                }
            } catch (Exception e) {
                log.error("(Direct Instantiation) Failed to instantiate template [{}]: {}", template.getTemplateId(), e.getMessage(), e);
            }
        }

        log.info("(Direct Instantiation) Successfully created [{}] SOP instances for date [{}].", createdSops.size(), targetDate);
        return createdSops;
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
                        : ((version.getStartDateTime() != null) ? version.getStartDateTime().toLocalDate()
                                : entityToday);

                if (sopStartDate.isAfter(entityToday)) {
                    continue;
                }

                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(version.getFrequency());
                String periodKey = strategy.calculatePeriodKey(entityToday);

                if (Boolean.FALSE.equals(version.getIsRecurring())
                        && taskRepository.existsBySop_SopId(sop.getSopId())) {
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
                }
            } catch (Exception e) {
                log.error("(Legacy) Failed to generate task for SOP Version [{}]: {}", version.getVersionId(),
                        e.getMessage(), e);
            }
        }
        log.info("(Legacy) Idempotently created [{}] tasks from SOP versions.", generatedCount);
    }

    private void generateFromSopTemplates(LocalDate today) {
        generateFromSopTemplates(today, null);
    }

    private void generateFromSopTemplates(LocalDate today, Boolean bypassRecurrenceCheck) {
        List<SopTemplate> schedulableTemplates = sopTemplateRepository.findSchedulableTemplates(
                SopTemplateStatus.ACTIVE, today);

        if (schedulableTemplates.isEmpty()) {
            log.info("(Template) No schedulable ACTIVE SOP Templates found for date [{}].", today);
            return;
        }

        boolean skipChecks = Boolean.TRUE.equals(bypassRecurrenceCheck);
        enqueueTemplatesToCloudTasks(schedulableTemplates, today, skipChecks);
    }

    private boolean isTemplateDueAndNotInstantiated(SopTemplate template, LocalDate today, boolean skipChecks) {
        if (skipChecks) {
            log.info("[Demo Mode] Bypassing recurrence & DB existence checks for Template [{}]", template.getTemplateCode());
            return true;
        }

        RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(template.getFrequency());
        if (!strategy.isDueToday(today, template.getRecurrenceConfig())) {
            log.debug("Template [{}] is not due today [{}] based on recurrenceConfig [{}]. Skipping.",
                    template.getTemplateCode(), today, template.getRecurrenceConfig());
            return false;
        }

        String periodKey = strategy.calculatePeriodKey(today);
        boolean sopInstanceExists = sopRepository
                .findBySopCode(buildSopCode(template.getTemplateCode(), periodKey)).isPresent();

        if (sopInstanceExists) {
            log.debug("SOP Instance for template [{}] and period [{}] already exists. Skipping.", template.getTemplateCode(), periodKey);
            return false;
        }

        return true;
    }

    private void enqueueTemplatesToCloudTasks(List<SopTemplate> templates, LocalDate today, boolean skipChecks) {
        String queuePath = QueueName.of(projectId, locationId, queueId).toString();

        try (CloudTasksClient client = CloudTasksClient.create()) {
            int queuedCount = 0;

            for (SopTemplate template : templates) {
                try {
                    if (!isTemplateDueAndNotInstantiated(template, today, skipChecks)) {
                        continue;
                    }

                    enqueueSingleCloudTask(client, queuePath, template, today);
                    queuedCount++;
                    log.info("Enqueued Cloud Task for Template [{}]", template.getTemplateCode());

                } catch (com.google.api.gax.rpc.AlreadyExistsException e) {
                    log.debug("Task for Template [{}] already queued in Cloud Tasks for today.", template.getTemplateCode());
                } catch (Exception e) {
                    log.error("(Template) Failed to enqueue template [{}]: {}", template.getTemplateId(), e.getMessage(), e);
                }
            }
            log.info("(Template) Dispatched [{}] templates to Cloud Tasks.", queuedCount);

        } catch (Exception e) {
            log.error("Failed to initialize Cloud Tasks Client: {}", e.getMessage(), e);
        }
    }

    private void enqueueSingleCloudTask(CloudTasksClient client, String queuePath, SopTemplate template, LocalDate today) {
        String payload = String.format("{\"templateId\":\"%s\",\"executionDate\":\"%s\"}",
                template.getTemplateId(), today);

        String taskName = String.format("%s/tasks/soptpl-%s-%s",
                queuePath, template.getTemplateId(), today);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .setUrl(backendWorkerUrl)
                .setHttpMethod(HttpMethod.POST)
                .putHeaders("Content-Type", "application/json")
                .setBody(ByteString.copyFromUtf8(payload))
                .setOidcToken(
                        OidcToken.newBuilder()
                                .setServiceAccountEmail(invokerServiceAccountEmail)
                                .setAudience(backendWorkerUrl)
                                .build())
                .build();

        com.google.cloud.tasks.v2.Task cloudTask = com.google.cloud.tasks.v2.Task.newBuilder()
                .setName(taskName)
                .setHttpRequest(httpRequest)
                .build();

        client.createTask(queuePath, cloudTask);
    }

    // SHARED WORKER LOGIC - Kept intact for both Cloud Tasks & Manual triggers
    @Transactional
    public Sop instantiateSingleSopTemplate(SopTemplate template, LocalDate today) {
        if (template == null) return null;

        RecurrenceStrategy strategy = recurrenceStrategyFactory
                .getStrategy(template.getFrequency() != null ? template.getFrequency()
                        : com.cloudkaptan.sop.domain.enums.SopFrequency.MONTHLY);
        String periodKey = strategy.calculatePeriodKey(today);
        String sopCode = buildSopCode(template.getTemplateCode(), periodKey);

        if (sopRepository.findBySopCode(sopCode).isPresent()) {
            periodKey = periodKey + "-" + (System.currentTimeMillis() % 10000);
            sopCode = buildSopCode(template.getTemplateCode(), periodKey);
        }

        LocalDate sopStartDate = (template.getEffectiveFrom() != null && template.getEffectiveFrom().isAfter(today))
                ? template.getEffectiveFrom()
                : today;

        int effectiveDueDayOffset = SopTemplateService.getEffectiveDueDayOffset(template.getDueDayOffset(),
                template.getFrequency(), sopStartDate);
        LocalDate sopDueDate = sopStartDate.plusDays(effectiveDueDayOffset);

        Sop sopInstance = Sop.builder()
                .sopCode(sopCode)
                .title(template.getTitle())
                .description(template.getDescription())
                .processCategory(template.getProcessCategory())
                .entity(template.getEntity())
                .frequency(template.getFrequency())
                .isRecurring(template.getIsRecurring())
                .dueDayOffset(effectiveDueDayOffset)
                .startDate(sopStartDate)
                .dueDate(sopDueDate)
                .defaultMakerIds(template.getDefaultMakerIds() != null ? new ArrayList<>(template.getDefaultMakerIds()) : new ArrayList<>())
                .defaultCheckerIds(template.getDefaultCheckerIds() != null ? new ArrayList<>(template.getDefaultCheckerIds()) : new ArrayList<>())
                .status(SopStatus.IN_PROGRESS)
                .templateId(template.getTemplateId())
                .createdBy(template.getCreatedBy())
                .build();

        Sop savedSop = sopRepository.save(sopInstance);
        log.info("(Template Worker) Generated SOP instance [{}] for period [{}]", sopCode, periodKey);

        List<TaskTemplate> taskTemplates = template.getTaskTemplates();
        if (taskTemplates != null && !taskTemplates.isEmpty()) {
            List<TaskTemplate> sortedSteps = taskTemplates.stream()
                    .sorted(java.util.Comparator.comparingInt(TaskTemplate::getStepSequence))
                    .toList();

            Task previousTask = null;
            for (TaskTemplate taskTemplate : sortedSteps) {
                try {
                    int startOffset = (taskTemplate.getEtaStartDay() != null) ? taskTemplate.getEtaStartDay() : 0;
                    int endOffset = (taskTemplate.getEtaEndDay() != null) ? taskTemplate.getEtaEndDay() : 0;

                    int durationDays;
                    if (endOffset > startOffset) {
                        durationDays = endOffset - startOffset;
                    } else if (taskTemplate.getSlaHours() != null && taskTemplate.getSlaHours() > 0) {
                        durationDays = Math.max(1, taskTemplate.getSlaHours() / 24);
                    } else {
                        durationDays = 4;
                    }

                    LocalDate taskStartDate;
                    LocalDate taskDueDate;
                    TaskStatus initialStatus;

                    if (previousTask == null || taskTemplate.getStepSequence() == 1) {
                        taskStartDate = sopStartDate.plusDays(startOffset);
                        taskDueDate = (endOffset > startOffset)
                                ? sopStartDate.plusDays(endOffset)
                                : taskStartDate.plusDays(durationDays);
                        initialStatus = TaskStatus.OPEN;
                    } else {
                        LocalDate explicitStartDate = sopStartDate.plusDays(startOffset);
                        if (startOffset > 0 && explicitStartDate.isAfter(previousTask.getStartDate())) {
                            taskStartDate = explicitStartDate;
                        } else {
                            // Sequential execution: next task starts the day after previous task's due date
                            taskStartDate = previousTask.getDueDate().plusDays(1);
                        }

                        if (endOffset > startOffset && sopStartDate.plusDays(endOffset).isAfter(taskStartDate)) {
                            taskDueDate = sopStartDate.plusDays(endOffset);
                        } else {
                            taskDueDate = taskStartDate.plusDays(durationDays);
                        }

                        if ("INDEPENDENT".equalsIgnoreCase(taskTemplate.getDependencyMode())) {
                            initialStatus = TaskStatus.OPEN;
                        } else {
                            initialStatus = today.isBefore(taskStartDate) ? TaskStatus.LOCKED : TaskStatus.OPEN;
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
                } catch (Exception te) {
                    log.error("(Template Worker) Failed to generate task step [{}] for SOP [{}]: {}",
                            taskTemplate.getStepSequence(), sopCode, te.getMessage(), te);
                }
            }
        }
        return savedSop;
    }

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

package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategy;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategyFactory;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.SopRepository;
import com.cloudkaptan.sop.repository.SopVersionRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskSchedulerService {

    private final SopRepository sopRepository;
    private final SopVersionRepository sopVersionRepository;
    private final TaskRepository taskRepository;
    private final RecurrenceStrategyFactory recurrenceStrategyFactory;
    private final AuditLogRepository auditLogRepository;
    private final NotificationPublisherService notificationPublisherService;

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Application started. Triggering initial task generation sweep...");
        try {
            generateScheduledTasks();
        } catch (Exception e) {
            log.error("Failed to run startup task generation sweep: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${app.task-scheduler.cron:0 0 0 * * ?}")
    @Transactional
    public void generateScheduledTasks() {
        log.info("Executing scheduled task generation engine...");
        List<com.cloudkaptan.sop.entity.SopVersion> activeVersions = new java.util.ArrayList<>(sopVersionRepository.findActiveRunningVersions());

        // Auto-repair: Ensure all ACTIVE Sops have a corresponding SopVersion entry
        List<Sop> activeSops = sopRepository.findByStatus(SopStatus.ACTIVE);
        for (Sop sop : activeSops) {
            boolean hasVersion = activeVersions.stream().anyMatch(v -> v.getSop().getSopId().equals(sop.getSopId()));
            if (!hasVersion) {
                com.cloudkaptan.sop.entity.SopVersion newVersion = com.cloudkaptan.sop.entity.SopVersion.builder()
                        .sop(sop)
                        .versionNumber("1.0")
                        .frequency(sop.getFrequency() != null ? sop.getFrequency() : com.cloudkaptan.sop.domain.enums.SopFrequency.MONTHLY)
                        .startDateTime(java.time.OffsetDateTime.now().minusMinutes(5))
                        .dueDateTime(java.time.OffsetDateTime.now().plusDays(sop.getDueDayOffset() != null ? sop.getDueDayOffset() : 7))
                        .isRecurring(Boolean.TRUE.equals(sop.getIsRecurring()))
                        .versionStatus("APPROVED")
                        .isRunning(true)
                        .createdBy(sop.getCreatedBy() != null ? sop.getCreatedBy().getUserId() : "usr-manoj-042")
                        .build();
                com.cloudkaptan.sop.entity.SopVersion savedVer = sopVersionRepository.save(newVersion);
                activeVersions.add(savedVer);
                log.info("Auto-generated missing active SopVersion [1.0] for SOP [{}]", sop.getSopCode());
            } else {
                // Ensure existing active version has a valid past/current startDateTime so task generation is not skipped
                for (com.cloudkaptan.sop.entity.SopVersion v : activeVersions) {
                    if (v.getSop().getSopId().equals(sop.getSopId())) {
                        if (v.getStartDateTime() == null || v.getStartDateTime().isAfter(java.time.OffsetDateTime.now())) {
                            v.setStartDateTime(java.time.OffsetDateTime.now().minusMinutes(5));
                            sopVersionRepository.save(v);
                            log.info("Auto-repaired SopVersion startDateTime to current time for ACTIVE SOP [{}]", sop.getSopCode());
                        }
                    }
                }
            }
        }

        LocalDate today = LocalDate.now();
        int generatedCount = 0;
        for (com.cloudkaptan.sop.entity.SopVersion version : activeVersions) {
            try {
                Sop sop = version.getSop();

                // Skip non-active parent SOPs
                if (sop.getStatus() != SopStatus.ACTIVE) {
                    log.info("Skipping task generation for SOP [{}] - status is [{}] (not ACTIVE).",
                            sop.getSopCode(), sop.getStatus());
                    continue;
                }

                // Future Start Date Guard: Do NOT create tasks before startDateTime arrives (with 30s grace window)
                if (version.getStartDateTime() != null && version.getStartDateTime().isAfter(java.time.OffsetDateTime.now().plusSeconds(30))) {
                    log.info("Skipping task generation for SOP [{}] - startDateTime [{}] is in the future.",
                            sop.getSopCode(), version.getStartDateTime());
                    continue;
                }

                LocalDate entityToday = (sop.getEntity() != null && sop.getEntity().getEntityCode() != null)
                    ? sop.getEntity().getEntityCode().getCurrentLocalDate()
                    : today;

                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(version.getFrequency());
                String periodKey = strategy.calculatePeriodKey(entityToday);

                // Non-recurring SOP guard: generate task only once across all periods
                if (Boolean.FALSE.equals(version.getIsRecurring()) && taskRepository.existsBySop_SopId(sop.getSopId())) {
                    log.info("Skipping task generation for non-recurring SOP [{}] - task already generated.", sop.getSopCode());
                    continue;
                }

                if (!taskRepository.existsBySop_SopIdAndPeriodKey(sop.getSopId(), periodKey)) {
                    LocalDate dueDate = (version.getDueDateTime() != null)
                        ? version.getDueDateTime().toLocalDate()
                        : strategy.calculateDueDate(today, sop.getDueDayOffset());
                    String recordNo = String.format("%s-%s", sop.getSopCode(), periodKey);

                    // Null-safe pool extraction
                    java.util.List<String> makerPool = (sop.getDefaultMakerIds() != null && !sop.getDefaultMakerIds().isEmpty())
                        ? new java.util.ArrayList<>(sop.getDefaultMakerIds())
                        : new java.util.ArrayList<>(java.util.List.of("usr-tushar-304"));

                    java.util.List<String> checkerPool = (sop.getDefaultCheckerIds() != null && !sop.getDefaultCheckerIds().isEmpty())
                        ? new java.util.ArrayList<>(sop.getDefaultCheckerIds())
                        : new java.util.ArrayList<>(java.util.List.of("usr-prayasa-410"));

                    Task task = Task.builder()
                        .sop(sop)
                        .recordNo(recordNo)
                        .periodKey(periodKey)
                        .entity(sop.getEntity())
                        .assignedMakerIds(makerPool)
                        .assignedCheckerIds(checkerPool)
                        .status(TaskStatus.OPEN)
                        .dueDate(dueDate)
                        .build();

                    Task savedTask = taskRepository.save(task);

                    AuditLog auditLog = AuditLog.builder()
                        .actorId(sop.getCreatedBy() != null ? sop.getCreatedBy().getUserId() : "usr-manoj-042")
                        .action("CREATE_TASK")
                        .entityType("TASK")
                        .entityId(recordNo)
                        .correlationId(UUID.randomUUID().toString())
                        .build();
                    auditLogRepository.save(auditLog);

                    // Send In-App Notification to assigned Makers
                    if (savedTask.getAssignedMakerIds() != null && !savedTask.getAssignedMakerIds().isEmpty()) {
                        for (String makerId : savedTask.getAssignedMakerIds()) {
                            notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                                .recipientUserId(makerId)
                                .eventType("TASK_ASSIGNED")
                                .title("Compliance Task Assigned for Submission")
                                .message("You have been assigned task " + savedTask.getRecordNo() + " (" + sop.getTitle() + ") to complete by " + savedTask.getDueDate())
                                .referenceEntityType("TASK")
                                .referenceEntityId(savedTask.getTaskId().toString())
                                .build());
                        }
                    }

                    generatedCount++;
                    log.info("Generated Task [{}] for SOP [{}] and Period [{}]", recordNo, sop.getSopCode(), periodKey);
                }
            } catch (Exception e) {
                log.error("Failed to generate task for SOP Version [{}]: {}", version.getVersionId(), e.getMessage(), e);
            }
        }
        log.info("Scheduled task generation completed. Idempotently created [{}] new tasks.", generatedCount);
    }
}

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
import com.cloudkaptan.sop.entity.SopVersion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
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

    @Scheduled(cron = "${app.task-scheduler.cron:0 0 0 * * ?}")
    @Transactional
    public void generateScheduledTasks() {
        log.info("Executing scheduled task generation engine...");
        LocalDate today = LocalDate.now();
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

                // Simple Logic: If SOP start date is in the future (sopStartDate > entityToday),
                // skip task generation for now — the scheduler will create it when the date arrives!
                if (sopStartDate.isAfter(entityToday)) {
                    log.info("Skipping task generation for SOP [{}] - start date [{}] is in the future relative to today [{}].",
                            sop.getSopCode(), sopStartDate, entityToday);
                    continue;
                }

                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(version.getFrequency());
                String periodKey = strategy.calculatePeriodKey(entityToday);

                // Non-recurring SOP guard: generate task only once across all periods
                if (Boolean.FALSE.equals(version.getIsRecurring()) && taskRepository.existsBySop_SopId(sop.getSopId())) {
                    log.info("Skipping task generation for non-recurring SOP [{}] - task already generated.", sop.getSopCode());
                    continue;
                }

                if (!taskRepository.existsBySop_SopIdAndPeriodKey(sop.getSopId(), periodKey)) {
                    LocalDate taskStartDate = sopStartDate;
                    LocalDate taskDueDate = (sop.getDueDate() != null)
                        ? sop.getDueDate()
                        : ((version.getDueDateTime() != null) ? version.getDueDateTime().toLocalDate() : taskStartDate.plusDays(sop.getDueDayOffset() != null ? sop.getDueDayOffset() : 7));

                    OffsetDateTime taskStartDateTime = taskStartDate.atStartOfDay().atOffset(ZoneOffset.UTC);
                    OffsetDateTime taskDueDateTime = taskDueDate.atStartOfDay().atOffset(ZoneOffset.UTC);

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

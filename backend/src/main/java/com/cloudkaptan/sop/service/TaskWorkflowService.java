package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.ApplyRowLevelSecurity;
import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.state.TaskContext;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.event.TaskStatusChangedEvent;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskWorkflowService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final com.cloudkaptan.sop.repository.AuditLogRepository auditLogRepository;
    private final com.cloudkaptan.sop.repository.TaskEventRepository taskEventRepository;
    private final com.cloudkaptan.sop.repository.TaskCommentRepository taskCommentRepository;
    private final NotificationPublisherService notificationPublisherService;
    private final com.cloudkaptan.sop.repository.UserNotificationRepository userNotificationRepository;
    private final com.cloudkaptan.sop.config.security.SopSecurityEvaluator sopSecurityEvaluator;
    private final UserCategoryPermissionService categoryPermissionService;
    private final com.cloudkaptan.sop.repository.TaskReassignmentHistoryRepository taskReassignmentHistoryRepository;
    private final TaskSchedulerService taskSchedulerService;
    private final com.cloudkaptan.sop.repository.TaskDocumentRepository taskDocumentRepository;

    @Transactional
    public TaskDto processTaskAction(UUID taskId, com.cloudkaptan.sop.dto.TaskActionRequest request) {
        String act = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        switch (act) {
            case "SUBMIT":
            case "RESUBMIT":
                return submitTask(taskId, request.getActorId(), request.getComment());
            case "APPROVE":
                return approveTask(taskId, request.getActorId(), request.getComment());
            case "REJECT":
                return rejectTask(taskId, request.getActorId(), request.getComment(), request.getPermanentRejection());
            case "PERMANENT_REJECT":
                return rejectTask(taskId, request.getActorId(), request.getComment(), true);
            default:
                throw new IllegalArgumentException("Invalid or missing task action: '" + request.getAction() + "'. Allowed values: SUBMIT, APPROVE, REJECT, PERMANENT_REJECT.");
        }
    }

    @Transactional
    public TaskDto submitTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.PENDING_REVIEW || task.getStatus() == TaskStatus.APPROVED) {
            throw new IllegalStateException("Task is locked and has already been submitted by " + (task.getMaker() != null ? task.getMaker().getFullName() : "another Maker"));
        }

        User actor = getUserOrThrow(actorId);
        task.setMaker(actor);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.submit(actor, comment);

        Task saved = taskRepository.save(task);
        String actionName = (fromStatus == TaskStatus.REJECTED) ? "RESUBMIT" : "SUBMIT";
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), actionName, comment));

        // Clean up obsolete notifications for this task ID across all users
        try {
            userNotificationRepository.deleteByReferenceEntityId(saved.getTaskId().toString());
            userNotificationRepository.deleteByReferenceEntityId(saved.getRecordNo());
        } catch (Exception e) {
            // Non-fatal cleanup
        }

        // Publish In-App Notification to assigned Checkers
        List<String> checkerIds = (saved.getAssignedCheckerIds() != null && !saved.getAssignedCheckerIds().isEmpty())
                ? saved.getAssignedCheckerIds()
                : (saved.getChecker() != null ? List.of(saved.getChecker().getUserId()) : List.of("usr-vivek-108", "usr-mainak-215"));

        for (String cId : checkerIds) {
            if (!cId.equals(actorId)) {
                notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                        .recipientUserId(cId)
                        .eventType("TASK_SUBMITTED")
                        .title("Compliance Task Review Required")
                        .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") submitted by " + actor.getFullName())
                        .referenceEntityType("TASK")
                        .referenceEntityId(saved.getTaskId().toString())
                        .build());
            }
        }

        return mapToDto(saved);
    }

    @Transactional
    public TaskDto approveTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED) {
            throw new IllegalStateException("Task is locked and has already been reviewed by " + (task.getChecker() != null ? task.getChecker().getFullName() : "another Checker"));
        }

        User actor = getUserOrThrow(actorId);

        // Enforce Segregation of Duties (SoD): Maker cannot approve their own task
        sopSecurityEvaluator.validateTaskReviewSoD(actor, task);

        task.setChecker(actor);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.approve(actor, comment);

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), "APPROVE", comment));

        // Clean up obsolete notifications for this task ID across all users
        try {
            userNotificationRepository.deleteByReferenceEntityId(saved.getTaskId().toString());
            userNotificationRepository.deleteByReferenceEntityId(saved.getRecordNo());
        } catch (Exception e) {
            // Non-fatal cleanup
        }

        // Publish In-App Notification to assigned Maker
        String makerId = saved.getMaker() != null ? saved.getMaker().getUserId() : (saved.getAssignedMakerIds() != null && !saved.getAssignedMakerIds().isEmpty() ? saved.getAssignedMakerIds().get(0) : null);
        if (makerId != null) {
            notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                    .recipientUserId(makerId)
                    .eventType("TASK_APPROVED")
                    .title("Compliance Task Approved")
                    .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") approved by " + actor.getFullName())
                    .referenceEntityType("TASK")
                    .referenceEntityId(saved.getTaskId().toString())
                    .build());
        }

        return mapToDto(saved);
    }

    @Transactional
    public TaskDto rejectTask(UUID taskId, String actorId, String comment, Boolean permanentRejection) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new IllegalStateException("Task is locked and has already been reviewed by " + (task.getChecker() != null ? task.getChecker().getFullName() : "another Checker"));
        }

        User actor = getUserOrThrow(actorId);

        // Enforce Segregation of Duties (SoD): Maker cannot reject/verify their own task
        sopSecurityEvaluator.validateTaskReviewSoD(actor, task);
        task.setChecker(actor);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        if (Boolean.TRUE.equals(permanentRejection)) {
            if (comment == null || comment.isBlank()) {
                throw new IllegalArgumentException("Rejection reason is mandatory when rejecting a task.");
            }
            task.setStatus(TaskStatus.PERMANENTLY_REJECTED);
        } else {
            context.reject(actor, comment);
        }

        Task saved = taskRepository.save(task);
        String actionName = Boolean.TRUE.equals(permanentRejection) ? "PERMANENT_REJECT" : "REJECT";
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), actionName, comment));

        // Clean up obsolete notifications for this task ID across all users
        try {
            userNotificationRepository.deleteByReferenceEntityId(saved.getTaskId().toString());
            userNotificationRepository.deleteByReferenceEntityId(saved.getRecordNo());
        } catch (Exception e) {
            // Non-fatal cleanup
        }

        // Publish In-App Notification to assigned Maker
        String makerId = saved.getMaker() != null ? saved.getMaker().getUserId() : (saved.getAssignedMakerIds() != null && !saved.getAssignedMakerIds().isEmpty() ? saved.getAssignedMakerIds().get(0) : null);
        if (makerId != null) {
            notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                    .recipientUserId(makerId)
                    .eventType("TASK_REJECTED")
                    .title("Compliance Task Rejected")
                    .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") was rejected. Reason: " + (comment != null ? comment : "Needs revision."))
                    .referenceEntityType("TASK")
                    .referenceEntityId(saved.getTaskId().toString())
                    .build());
        }

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public TaskDto getTaskById(UUID taskId) {
        Task task = getTaskOrThrow(taskId);
        return mapToDto(task);
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        Task task = getTaskOrThrow(taskId);
        taskRepository.delete(task);

        com.cloudkaptan.sop.entity.AuditLog auditLog = com.cloudkaptan.sop.entity.AuditLog.builder()
            .actorId("usr-manoj-042")
            .action("DELETE_TASK")
            .entityType("TASK")
            .entityId(task.getRecordNo())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public Page<TaskInboxView> getInbox(List<EntityCode> entities, TaskStatus status, String userId, Pageable pageable) {
        return taskRepository.findInboxTasks(entities, status, userId, pageable);
    }

    @ApplyRowLevelSecurity
    @Transactional(readOnly = true)
    public List<TaskDto> getTasks(List<EntityCode> entities) {
        return getTasksForUser(entities, null, "ADMIN");
    }

    @ApplyRowLevelSecurity
    @Transactional
    public List<TaskDto> getTasksForUser(List<EntityCode> entities, String userId, String userRole) {
        try {
            taskSchedulerService.generateScheduledTasks();
        } catch (Exception e) {
            // Non-fatal if already generating
        }

        List<Task> tasks = taskRepository.findTasksByEntities(entities);

        if ("ADMIN".equalsIgnoreCase(userRole) || userId == null || userId.isBlank()) {
            return tasks.stream().map(this::mapToDto).toList();
        }

        final String uid = userId.trim();
        User resolvedUser = userRepository.findById(uid)
                .or(() -> userRepository.findByEmail(uid))
                .orElse(null);

        final String userEmail = resolvedUser != null ? resolvedUser.getEmail() : null;
        final String userFullName = resolvedUser != null ? resolvedUser.getFullName() : null;

        // NON_ADMIN user: Filter strictly by assigned process categories & direct assignments
        List<String> accessibleCategories = categoryPermissionService.getUserAccessibleCategories(uid);

        return tasks.stream()
            .filter(task -> {
                String cat = task.getSop() != null ? task.getSop().getProcessCategory() : null;
                boolean categoryAllowed = cat != null && accessibleCategories.contains(cat);

                Sop sop = task.getSop();
                boolean isSopCreator = false;
                if (sop != null) {
                    if (sop.getCreatedBy() != null) {
                        String cbId = sop.getCreatedBy().getUserId();
                        String cbEmail = sop.getCreatedBy().getEmail();
                        if (uid.equalsIgnoreCase(cbId) || (userEmail != null && userEmail.equalsIgnoreCase(cbEmail)) || (cbId != null && cbId.equalsIgnoreCase(userEmail))) {
                            isSopCreator = true;
                        }
                    }
                    if (sop.getAssignedCreatorId() != null && (uid.equalsIgnoreCase(sop.getAssignedCreatorId()) || (userEmail != null && userEmail.equalsIgnoreCase(sop.getAssignedCreatorId())))) {
                        isSopCreator = true;
                    }
                    if (sop.getAssignedCreatorIds() != null && (sop.getAssignedCreatorIds().contains(uid) || (userEmail != null && sop.getAssignedCreatorIds().contains(userEmail)))) {
                        isSopCreator = true;
                    }
                }

                boolean isSopApprover = false;
                if (sop != null) {
                    if (sop.getAssignedApproverId() != null && (uid.equalsIgnoreCase(sop.getAssignedApproverId()) || (userEmail != null && userEmail.equalsIgnoreCase(sop.getAssignedApproverId())))) {
                        isSopApprover = true;
                    }
                    if (sop.getAssignedApproverIds() != null && (sop.getAssignedApproverIds().contains(uid) || (userEmail != null && sop.getAssignedApproverIds().contains(userEmail)))) {
                        isSopApprover = true;
                    }
                }

                boolean isDirectlyAssigned = (task.getMaker() != null && (uid.equalsIgnoreCase(task.getMaker().getUserId()) || (userEmail != null && userEmail.equalsIgnoreCase(task.getMaker().getEmail()))))
                        || (task.getChecker() != null && (uid.equalsIgnoreCase(task.getChecker().getUserId()) || (userEmail != null && userEmail.equalsIgnoreCase(task.getChecker().getEmail()))))
                        || (task.getAssignedMakerIds() != null && (task.getAssignedMakerIds().contains(uid) || (userEmail != null && task.getAssignedMakerIds().contains(userEmail)) || (userFullName != null && task.getAssignedMakerIds().contains(userFullName))))
                        || (task.getAssignedCheckerIds() != null && (task.getAssignedCheckerIds().contains(uid) || (userEmail != null && task.getAssignedCheckerIds().contains(userEmail)) || (userFullName != null && task.getAssignedCheckerIds().contains(userFullName))))
                        || isSopCreator
                        || isSopApprover;

                return categoryAllowed || isDirectlyAssigned;
            })
            .map(this::mapToDto)
            .toList();
    }

    private Task getTaskOrThrow(UUID taskId) {
        return taskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
            .or(() -> userRepository.findByEmail(userId))
            .orElseThrow(() -> new ResourceNotFoundException("User not found with ID or Email: " + userId));
    }

    @Transactional
    public TaskDto reassignTask(UUID taskId, com.cloudkaptan.sop.dto.TaskReassignRequest request) {
        Task task = getTaskOrThrow(taskId);
        User actor = getUserOrThrow(request.getActorId());

        // Validate Authorization: Must be Admin, SOP Creator, or SOP Approver
        String actorId = actor.getUserId();
        String actorEmail = actor.getEmail();
        String userRole = actor.getRole() != null ? actor.getRole().name() : "";
        boolean isAdmin = "ADMIN".equalsIgnoreCase(userRole);

        com.cloudkaptan.sop.entity.Sop sop = task.getSop();
        boolean isSopCreator = (sop.getCreatedBy() != null && (actorId.equalsIgnoreCase(sop.getCreatedBy().getUserId()) || (actorEmail != null && actorEmail.equalsIgnoreCase(sop.getCreatedBy().getEmail()))))
                || (sop.getAssignedCreatorId() != null && (actorId.equalsIgnoreCase(sop.getAssignedCreatorId()) || (actorEmail != null && actorEmail.equalsIgnoreCase(sop.getAssignedCreatorId()))))
                || (sop.getAssignedCreatorIds() != null && (sop.getAssignedCreatorIds().contains(actorId) || (actorEmail != null && sop.getAssignedCreatorIds().contains(actorEmail))))
                || categoryPermissionService.hasPermission(actorId, sop.getProcessCategory(), "CREATE_SOP");

        boolean isSopApprover = (sop.getAssignedApproverId() != null && (actorId.equalsIgnoreCase(sop.getAssignedApproverId()) || (actorEmail != null && actorEmail.equalsIgnoreCase(sop.getAssignedApproverId()))))
                || (sop.getAssignedApproverIds() != null && (sop.getAssignedApproverIds().contains(actorId) || (actorEmail != null && sop.getAssignedApproverIds().contains(actorEmail))))
                || categoryPermissionService.hasPermission(actorId, sop.getProcessCategory(), "APPROVE_SOP");

        if (!isAdmin && !isSopCreator && !isSopApprover) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Access Denied: Only the SOP Creator, SOP Approver, or Admin can edit/reassign this task."
            );
        }

        // Capture previous assigned Maker & Checker full names
        List<String> prevMakerIds = (task.getAssignedMakerIds() != null && !task.getAssignedMakerIds().isEmpty())
                ? new java.util.ArrayList<>(task.getAssignedMakerIds())
                : (task.getMaker() != null ? List.of(task.getMaker().getUserId()) : List.of());

        List<String> prevCheckerIds = (task.getAssignedCheckerIds() != null && !task.getAssignedCheckerIds().isEmpty())
                ? new java.util.ArrayList<>(task.getAssignedCheckerIds())
                : (task.getChecker() != null ? List.of(task.getChecker().getUserId()) : List.of());

        String prevMakerNames = prevMakerIds.stream()
                .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
                .collect(java.util.stream.Collectors.joining(", "));

        String prevCheckerNames = prevCheckerIds.stream()
                .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
                .collect(java.util.stream.Collectors.joining(", "));

        // Update task assignments
        List<String> newMakerIds = request.getMakerIds() != null ? request.getMakerIds() : prevMakerIds;
        List<String> newCheckerIds = request.getCheckerIds() != null ? request.getCheckerIds() : prevCheckerIds;

        task.setAssignedMakerIds(newMakerIds);
        task.setAssignedCheckerIds(newCheckerIds);

        String newMakerNames = newMakerIds.stream()
                .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
                .collect(java.util.stream.Collectors.joining(", "));

        String newCheckerNames = newCheckerIds.stream()
                .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
                .collect(java.util.stream.Collectors.joining(", "));

        // Save Reassignment History record
        com.cloudkaptan.sop.entity.TaskReassignmentHistory historyRecord = com.cloudkaptan.sop.entity.TaskReassignmentHistory.builder()
                .task(task)
                .previousMakerIds(String.join(", ", prevMakerIds))
                .previousMakerNames(prevMakerNames)
                .newMakerIds(String.join(", ", newMakerIds))
                .newMakerNames(newMakerNames)
                .previousCheckerIds(String.join(", ", prevCheckerIds))
                .previousCheckerNames(prevCheckerNames)
                .newCheckerIds(String.join(", ", newCheckerIds))
                .newCheckerNames(newCheckerNames)
                .reassignedBy(actorId)
                .reassignedByName(actor.getFullName())
                .workedUntil(java.time.OffsetDateTime.now())
                .reason(request.getReason() != null ? request.getReason().trim() : "Task reassignment updated by " + actor.getFullName())
                .build();

        taskReassignmentHistoryRepository.save(historyRecord);

        Task saved = taskRepository.save(task);

        // Record global audit log
        com.cloudkaptan.sop.entity.AuditLog auditLog = com.cloudkaptan.sop.entity.AuditLog.builder()
                .actorId(actorId)
                .action("REASSIGN_TASK")
                .entityType("TASK")
                .entityId(saved.getRecordNo())
                .correlationId(UUID.randomUUID().toString())
                .build();
        auditLogRepository.save(auditLog);

        // 1. Notify newly assigned Makers
        for (String mId : newMakerIds) {
            if (!mId.equals(actorId)) {
                notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                        .recipientUserId(mId)
                        .eventType("TASK_REASSIGNED")
                        .title("Task Assigned to You (Maker Pool)")
                        .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") was assigned to you as Maker by " + actor.getFullName())
                        .referenceEntityType("TASK")
                        .referenceEntityId(saved.getTaskId().toString())
                        .build());
            }
        }

        // 2. Notify newly assigned Checkers
        for (String cId : newCheckerIds) {
            if (!cId.equals(actorId) && !newMakerIds.contains(cId)) {
                notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                        .recipientUserId(cId)
                        .eventType("TASK_REASSIGNED")
                        .title("Task Assigned to You (Checker Pool)")
                        .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") was assigned to you as Checker by " + actor.getFullName())
                        .referenceEntityType("TASK")
                        .referenceEntityId(saved.getTaskId().toString())
                        .build());
            }
        }

        // 3. Notify SOP Creator & Approvers (if different from actor)
        java.util.Set<String> sopStakeholders = new java.util.HashSet<>();
        if (sop.getCreatedBy() != null) sopStakeholders.add(sop.getCreatedBy().getUserId());
        if (sop.getAssignedCreatorId() != null) sopStakeholders.add(sop.getAssignedCreatorId());
        if (sop.getAssignedCreatorIds() != null) sopStakeholders.addAll(sop.getAssignedCreatorIds());
        if (sop.getAssignedApproverId() != null) sopStakeholders.add(sop.getAssignedApproverId());
        if (sop.getAssignedApproverIds() != null) sopStakeholders.addAll(sop.getAssignedApproverIds());

        for (String stId : sopStakeholders) {
            if (stId != null && !stId.equals(actorId) && !newMakerIds.contains(stId) && !newCheckerIds.contains(stId)) {
                notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                        .recipientUserId(stId)
                        .eventType("TASK_REASSIGNED")
                        .title("Task Reassignment Notice")
                        .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") assignments were updated by " + actor.getFullName())
                        .referenceEntityType("TASK")
                        .referenceEntityId(saved.getTaskId().toString())
                        .build());
            }
        }

        return mapToDto(saved);
    }

    public TaskDto mapToDto(Task task) {
        long daysOverdue = 0;
        LocalDate entityToday = (task.getEntity() != null && task.getEntity().getEntityCode() != null)
            ? task.getEntity().getEntityCode().getCurrentLocalDate()
            : LocalDate.now();

        if (task.getDueDate() != null && entityToday.isAfter(task.getDueDate()) && task.getStatus() != TaskStatus.APPROVED) {
            daysOverdue = ChronoUnit.DAYS.between(task.getDueDate(), entityToday);
        }

        List<String> mIds = (task.getAssignedMakerIds() != null && !task.getAssignedMakerIds().isEmpty())
            ? task.getAssignedMakerIds()
            : ((task.getSop().getDefaultMakerIds() != null && !task.getSop().getDefaultMakerIds().isEmpty())
                ? task.getSop().getDefaultMakerIds()
                : (task.getMaker() != null ? List.of(task.getMaker().getUserId()) : List.of()));
        List<String> mNames = mIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
            .toList();

        List<String> cIds = (task.getAssignedCheckerIds() != null && !task.getAssignedCheckerIds().isEmpty())
            ? task.getAssignedCheckerIds()
            : ((task.getSop().getDefaultCheckerIds() != null && !task.getSop().getDefaultCheckerIds().isEmpty())
                ? task.getSop().getDefaultCheckerIds()
                : (task.getChecker() != null ? List.of(task.getChecker().getUserId()) : List.of()));
        List<String> cNames = cIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
            .toList();

        String actualMakerName = (task.getMaker() != null && (task.getStatus() == TaskStatus.PENDING_REVIEW || task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED))
            ? task.getMaker().getFullName() : null;

        String actualCheckerName = (task.getChecker() != null && (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED))
            ? task.getChecker().getFullName() : null;

        List<com.cloudkaptan.sop.entity.TaskEvent> rawEvents = taskEventRepository.findByTask_TaskIdOrderByTimestampAsc(task.getTaskId());
        List<com.cloudkaptan.sop.entity.TaskComment> rawComments = taskCommentRepository.findByTask_TaskIdOrderByCreatedAtAsc(task.getTaskId());

        List<com.cloudkaptan.sop.dto.TaskEventDto> historyList = new java.util.ArrayList<>();
        for (int idx = 0; idx < rawEvents.size(); idx++) {
            com.cloudkaptan.sop.entity.TaskEvent e = rawEvents.get(idx);
            String commentText = (idx < rawComments.size()) ? rawComments.get(idx).getCommentText() : null;
            if (commentText == null && !rawComments.isEmpty()) {
                commentText = rawComments.stream()
                    .filter(c -> c.getAuthor().getUserId().equals(e.getActor().getUserId()))
                    .map(com.cloudkaptan.sop.entity.TaskComment::getCommentText)
                    .reduce((first, second) -> second)
                    .orElse(null);
            }

            historyList.add(com.cloudkaptan.sop.dto.TaskEventDto.builder()
                .eventId(e.getEventId())
                .actorId(e.getActor().getUserId())
                .actorName(e.getActor().getFullName())
                .action(e.getAction())
                .fromStatus(e.getFromStatus())
                .toStatus(e.getToStatus())
                .comment(commentText)
                .timestamp(e.getTimestamp())
                .build());
        }

        boolean hasCreateEvent = historyList.stream().anyMatch(h -> h.getAction() != null && h.getAction().toUpperCase().contains("CREATE"));
        if (!hasCreateEvent) {
            historyList.add(0, com.cloudkaptan.sop.dto.TaskEventDto.builder()
                .eventId(0L)
                .actorId(task.getMaker() != null ? task.getMaker().getUserId() : "usr-manoj-042")
                .actorName("System Scheduler")
                .action("CREATE_TASK")
                .fromStatus(null)
                .toStatus(TaskStatus.OPEN)
                .comment("Automated compliance task cycle generated for " + task.getPeriodKey())
                .timestamp(task.getCreatedAt() != null ? task.getCreatedAt() : java.time.OffsetDateTime.now())
                .build());
        }

        List<com.cloudkaptan.sop.entity.TaskReassignmentHistory> rawReassignments =
                taskReassignmentHistoryRepository.findByTask_TaskIdOrderByWorkedUntilDesc(task.getTaskId());

        List<com.cloudkaptan.sop.dto.TaskReassignmentHistoryDto> reassignList = rawReassignments.stream()
                .map(r -> com.cloudkaptan.sop.dto.TaskReassignmentHistoryDto.builder()
                        .historyId(r.getHistoryId())
                        .taskId(task.getTaskId())
                        .previousMakerNames(r.getPreviousMakerNames())
                        .newMakerNames(r.getNewMakerNames())
                        .previousCheckerNames(r.getPreviousCheckerNames())
                        .newCheckerNames(r.getNewCheckerNames())
                        .reassignedById(r.getReassignedBy())
                        .reassignedByName(r.getReassignedByName())
                        .workedUntil(r.getWorkedUntil())
                        .reason(r.getReason())
                        .createdAt(r.getCreatedAt())
                        .build())
                .toList();

        List<String> creatorList = new java.util.ArrayList<>();
        if (task.getSop() != null) {
            if (task.getSop().getCreatedBy() != null) creatorList.add(task.getSop().getCreatedBy().getUserId());
            if (task.getSop().getAssignedCreatorId() != null) creatorList.add(task.getSop().getAssignedCreatorId());
            if (task.getSop().getAssignedCreatorIds() != null) creatorList.addAll(task.getSop().getAssignedCreatorIds());
        }

        List<String> approverList = new java.util.ArrayList<>();
        if (task.getSop() != null) {
            if (task.getSop().getAssignedApproverId() != null) approverList.add(task.getSop().getAssignedApproverId());
            if (task.getSop().getAssignedApproverIds() != null) approverList.addAll(task.getSop().getAssignedApproverIds());
        }

        List<com.cloudkaptan.sop.dto.TaskDocumentDto> documentList = taskDocumentRepository.findByTaskTaskIdOrderByUploadedAtDesc(task.getTaskId()).stream()
                .map(doc -> com.cloudkaptan.sop.dto.TaskDocumentDto.builder()
                        .documentId(doc.getDocumentId())
                        .taskId(doc.getTask().getTaskId())
                        .fileName(doc.getFileName())
                        .gcsObjectPath(doc.getGcsObjectPath())
                        .fileSize(doc.getFileSize())
                        .contentType(doc.getContentType())
                        .uploadedById(doc.getUploadedBy() != null ? doc.getUploadedBy().getUserId() : null)
                        .uploadedByName(doc.getUploadedBy() != null ? doc.getUploadedBy().getFullName() : null)
                        .uploadedAt(doc.getUploadedAt())
                        .build())
                .toList();

        return TaskDto.builder()
            .taskId(task.getTaskId())
            .version(task.getVersion())
            .recordNo(task.getRecordNo())
            .sopId(task.getSop().getSopId())
            .sopTitle(task.getSop().getTitle())
            .sopCode(task.getSop().getSopCode())
            .periodKey(task.getPeriodKey())
            .entityCode(task.getEntity().getEntityCode())
            .entityName(task.getEntity().getEntityName())
            .makerId(task.getMaker() != null ? task.getMaker().getUserId() : (mIds.isEmpty() ? null : mIds.get(0)))
            .makerName(task.getMaker() != null ? task.getMaker().getFullName() : (mNames.isEmpty() ? null : mNames.get(0)))
            .assignedMakerIds(mIds)
            .assignedMakerNames(mNames)
            .actualMakerId(task.getMaker() != null ? task.getMaker().getUserId() : null)
            .actualMakerName(actualMakerName)
            .checkerId(task.getChecker() != null ? task.getChecker().getUserId() : (cIds.isEmpty() ? null : cIds.get(0)))
            .checkerName(task.getChecker() != null ? task.getChecker().getFullName() : (cNames.isEmpty() ? null : cNames.get(0)))
            .assignedCheckerIds(cIds)
            .assignedCheckerNames(cNames)
            .actualCheckerId(task.getChecker() != null ? task.getChecker().getUserId() : null)
            .actualCheckerName(actualCheckerName)
            .status(task.getStatus())
            .dueDate(task.getDueDate())
            .daysOverdue(daysOverdue)
            .completedAt(task.getCompletedAt())
            .approvedAt(task.getApprovedAt())
            .createdAt(task.getCreatedAt())
            .sopCreatedBy(task.getSop() != null && task.getSop().getCreatedBy() != null ? task.getSop().getCreatedBy().getUserId() : (task.getSop() != null ? task.getSop().getAssignedCreatorId() : null))
            .sopAssignedCreatorIds(creatorList.stream().filter(Objects::nonNull).distinct().toList())
            .sopAssignedApproverIds(approverList.stream().filter(Objects::nonNull).distinct().toList())
            .history(historyList)
            .reassignmentHistory(reassignList)
            .documents(documentList)
            .build();
    }
}

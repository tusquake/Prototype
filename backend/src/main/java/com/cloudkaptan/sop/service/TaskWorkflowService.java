package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.ApplyRowLevelSecurity;
import com.cloudkaptan.sop.config.security.TenantContext;
import com.cloudkaptan.sop.domain.enums.*;
import com.cloudkaptan.sop.domain.state.TaskContext;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.entity.*;
import com.cloudkaptan.sop.event.TaskStatusChangedEvent;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.cloudkaptan.sop.config.security.SopSecurityEvaluator;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.dto.TaskActionRequest;
import com.cloudkaptan.sop.dto.TaskDocumentDto;
import com.cloudkaptan.sop.dto.TaskEventDto;
import com.cloudkaptan.sop.dto.TaskReassignmentHistoryDto;
import com.cloudkaptan.sop.dto.TaskReassignRequest;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.ProcessCategory;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.TaskComment;
import com.cloudkaptan.sop.entity.TaskEvent;
import com.cloudkaptan.sop.entity.TaskReassignmentHistory;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.ProcessCategoryRepository;
import com.cloudkaptan.sop.repository.TaskCommentRepository;
import com.cloudkaptan.sop.repository.TaskDocumentRepository;
import com.cloudkaptan.sop.repository.TaskEventRepository;
import com.cloudkaptan.sop.repository.TaskReassignmentHistoryRepository;
import com.cloudkaptan.sop.repository.TaskTemplateRepository;
import com.cloudkaptan.sop.repository.UserNotificationRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskWorkflowService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditLogRepository auditLogRepository;
    private final TaskEventRepository taskEventRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final NotificationPublisherService notificationPublisherService;
    private final UserNotificationRepository userNotificationRepository;
    private final SopSecurityEvaluator sopSecurityEvaluator;
    private final UserCategoryPermissionService categoryPermissionService;
    private final TaskReassignmentHistoryRepository taskReassignmentHistoryRepository;
    private final TaskSchedulerService taskSchedulerService;
    private final TaskDocumentRepository taskDocumentRepository;
    private final ProcessCategoryRepository processCategoryRepository;
    private final TaskTemplateRepository taskTemplateRepository;

    @Transactional
    public TaskDto processTaskAction(UUID taskId, TaskActionRequest request) {
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
        if (task.getStatus() == TaskStatus.PENDING_REVIEW || task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new IllegalStateException("Task is locked and cannot be submitted because its status is " + task.getStatus());
        }

        User actor = getUserOrThrow(actorId);
        
        // Proxy Submission Logic: Check if actor is an authorized manager
        TenantContext context = TenantContext.getContext();
        boolean isAuthorizedManager = false;
        
        if (context != null && context.getWritableSubordinateIds() != null && !context.getWritableSubordinateIds().isEmpty()) {
            List<String> assignedMakerIds = task.getAssignedMakerIds() != null ? task.getAssignedMakerIds() : Collections.emptyList();
            String existingMakerId = task.getMaker() != null ? task.getMaker().getUserId() : null;
            
            // Check if any of the assigned makers are in the actor's writable subordinates list
            if (!Collections.disjoint(assignedMakerIds, context.getWritableSubordinateIds()) 
                || (existingMakerId != null && context.getWritableSubordinateIds().contains(existingMakerId))) {
                isAuthorizedManager = true;
            }
        }

        // If the actor is NOT the officially assigned maker, but they ARE an authorized manager,
        // we leave the task.getMaker() as the original assignee, but log the actor in the event.
        // If they are just a normal Maker, they claim the task.
        if (isAuthorizedManager) {
            // If the actor is an authorized manager submitting on behalf of a subordinate,
            // ensure task.getMaker() is set to the target subordinate (not left null).
            if (task.getMaker() == null) {
                List<String> assignedMakerIds = task.getAssignedMakerIds() != null ? task.getAssignedMakerIds() : Collections.emptyList();
                String targetSubordinateId = assignedMakerIds.stream()
                        .filter(id -> context.getWritableSubordinateIds().contains(id))
                        .findFirst()
                        .orElse(actorId);

                User subordinateUser = userRepository.findById(targetSubordinateId).orElse(actor);
                task.setMaker(subordinateUser);
            }
        } else {
            task.setMaker(actor);
        }

        TaskStatus fromStatus = task.getStatus();

        TaskContext taskContext = new TaskContext(task);
        taskContext.submit(actor, comment);

        Task saved = taskRepository.save(task);
        String actionName = (fromStatus == TaskStatus.REJECTED) ? "RESUBMIT" : "SUBMIT";
        
        // Note: 'actor' here is the actual person clicking submit (e.g. the Finance Lead),
        // which guarantees the audit trail correctly logs the proxy submission.
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
                notificationPublisherService.publishNotification(NotificationEventDto.builder()
                        .recipientUserId(cId)
                        .eventType("TASK_SUBMITTED")
                        .title("Compliance Task Review Required")
                        .message("Task " + saved.getRecordNo() + " (" + saved.getSop().getTitle() + ") submitted by " + actor.getFullName())
                        .referenceEntityType("TASK")
                        .referenceEntityId(saved.getTaskId().toString())
                        .build());
            }
        }

        // Option A Early Trigger: Unlock next dependent task as soon as Maker submits this task!
        unlockNextDependentTaskOnSubmission(saved);

        return mapToDto(saved);
    }

    private void unlockNextDependentTaskOnSubmission(Task submittedTask) {
        if (submittedTask == null || submittedTask.getSop() == null) return;
        try {
            List<Task> sopTasks = taskRepository.findBySop_SopIdOrderByRecordNoAsc(submittedTask.getSop().getSopId());
            if (sopTasks == null || sopTasks.isEmpty()) return;

            int currentIndex = -1;
            for (int i = 0; i < sopTasks.size(); i++) {
                if (sopTasks.get(i).getTaskId().equals(submittedTask.getTaskId())) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex != -1 && currentIndex + 1 < sopTasks.size()) {
                Task nextTask = sopTasks.get(currentIndex + 1);
                if (nextTask.getStatus() == TaskStatus.LOCKED) {
                    nextTask.setStatus(TaskStatus.OPEN);
                    nextTask.setStartDate(java.time.LocalDate.now());
                    Task unlocked = taskRepository.save(nextTask);
                    log.info("Option A Early Trigger: Unlocked dependent Task [{}] ({}) immediately on submission of Task [{}]",
                            unlocked.getRecordNo(), unlocked.getTaskId(), submittedTask.getRecordNo());

                    List<String> makerIds = unlocked.getAssignedMakerIds();
                    if (makerIds != null && !makerIds.isEmpty()) {
                        for (String mId : makerIds) {
                            notificationPublisherService.publishNotification(NotificationEventDto.builder()
                                    .recipientUserId(mId)
                                    .eventType("TASK_UNLOCKED")
                                    .title("Dependent Task Unlocked")
                                    .message("Task " + unlocked.getRecordNo() + " is now unlocked and ready for execution.")
                                    .referenceEntityType("TASK")
                                    .referenceEntityId(unlocked.getTaskId().toString())
                                    .build());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to unlock next dependent task on submission: {}", e.getMessage());
        }
    }

    @Transactional
    public TaskDto approveTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new IllegalStateException("Task is locked and has already been reviewed by " + (task.getChecker() != null ? task.getChecker().getFullName() : "another Checker"));
        }

        User actor = getUserOrThrow(actorId);

        // Enforce Segregation of Duties (SoD): Maker cannot approve their own task
        sopSecurityEvaluator.validateTaskReviewSoD(actor, task);

        // Document Approval Gating Check: All pending evidence documents must be APPROVED by the Checker
        List<TaskDocument> docs = taskDocumentRepository.findByTaskTaskIdOrderByUploadedAtDesc(taskId);
        if (docs != null && !docs.isEmpty()) {
            boolean hasUnapproved = docs.stream().anyMatch(doc -> doc.getStatus() != DocumentStatus.APPROVED && doc.getStatus() != DocumentStatus.REJECTED);
            if (hasUnapproved) {
                throw new IllegalStateException("Task cannot be approved until all pending evidence documents are approved by the Checker.");
            }
        }

        task.setChecker(actor);
        TaskStatus fromStatus = task.getStatus();

        TaskContext taskContext = new TaskContext(task);
        taskContext.approve(actor, comment);

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
            notificationPublisherService.publishNotification(NotificationEventDto.builder()
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

        TaskContext taskContext = new TaskContext(task);
        if (Boolean.TRUE.equals(permanentRejection)) {
            if (comment == null || comment.isBlank()) {
                throw new IllegalArgumentException("Rejection reason is mandatory when rejecting a task.");
            }
            task.setStatus(TaskStatus.PERMANENTLY_REJECTED);
        } else {
            taskContext.reject(actor, comment);
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
            notificationPublisherService.publishNotification(NotificationEventDto.builder()
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

        AuditLog auditLog = AuditLog.builder()
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
    public Page<TaskDto> getTasksForUser(List<EntityCode> entities, String userId, String userRole, Pageable pageable) {
        List<TaskDto> allDtos = getTasksForUser(entities, userId, userRole);
        int start = (int) pageable.getOffset();
        if (start >= allDtos.size()) {
            return new PageImpl<>(List.of(), pageable, allDtos.size());
        }
        int end = Math.min(start + pageable.getPageSize(), allDtos.size());
        return new PageImpl<>(allDtos.subList(start, end), pageable, allDtos.size());
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

        TenantContext ctx = TenantContext.getContext();
        String currentUserId = (userId != null && !userId.isBlank()) ? userId.trim() : (ctx != null ? ctx.getUserId() : null);
        UserRole role = ctx != null && ctx.getUserRole() != null 
                ? ctx.getUserRole() 
                : ("ADMIN".equalsIgnoreCase(userRole) ? UserRole.ADMIN : UserRole.VIEWER);

        if (role == UserRole.ADMIN || currentUserId == null || currentUserId.isBlank()) {
            return tasks.stream().map(this::mapToDto).toList();
        }

        final String uid = currentUserId;
        User resolvedUser = userRepository.findById(uid)
                .or(() -> userRepository.findByEmail(uid))
                .orElse(null);

        final String targetUid = resolvedUser != null ? resolvedUser.getUserId() : uid;

        List<String> accessibleCategories = categoryPermissionService.getUserAccessibleCategories(targetUid);

        List<String> readableSubordinates = (ctx != null && ctx.getReadableSubordinateIds() != null)
                ? ctx.getReadableSubordinateIds()
                : Collections.emptyList();
        List<String> writableSubordinates = (ctx != null && ctx.getWritableSubordinateIds() != null)
                ? ctx.getWritableSubordinateIds()
                : Collections.emptyList();

        return tasks.stream()
            .filter(task -> isUserAuthorizedToViewTask(task, targetUid, accessibleCategories, readableSubordinates, writableSubordinates))
            .map(this::mapToDto)
            .toList();
    }

    private String resolveToUserId(String rawUserIdentifier) {
        if (rawUserIdentifier == null || rawUserIdentifier.isBlank()) return null;
        String trimmed = rawUserIdentifier.trim();
        return userRepository.findById(trimmed)
                .or(() -> userRepository.findByEmail(trimmed))
                .or(() -> userRepository.findByFullName(trimmed))
                .map(User::getUserId)
                .orElse(trimmed);
    }

    private List<String> getTaskMakerIds(Task task) {
        if (task == null) return List.of();
        List<String> raw = new java.util.ArrayList<>();
        if (task.getAssignedMakerIds() != null && !task.getAssignedMakerIds().isEmpty()) {
            raw.addAll(task.getAssignedMakerIds());
        }
        if (task.getSop() != null && task.getSop().getDefaultMakerIds() != null && !task.getSop().getDefaultMakerIds().isEmpty()) {
            raw.addAll(task.getSop().getDefaultMakerIds());
        }
        if (task.getMaker() != null) {
            if (task.getMaker().getUserId() != null) raw.add(task.getMaker().getUserId());
            if (task.getMaker().getEmail() != null) raw.add(task.getMaker().getEmail());
            if (task.getMaker().getFullName() != null) raw.add(task.getMaker().getFullName());
        }

        List<String> resolved = new java.util.ArrayList<>();
        for (String item : raw) {
            if (item != null && !item.isBlank()) {
                String t = item.trim();
                resolved.add(t);
                String r = resolveToUserId(t);
                if (r != null) resolved.add(r);
            }
        }
        return resolved.stream().filter(Objects::nonNull).distinct().toList();
    }

    private List<String> getTaskCheckerIds(Task task) {
        if (task == null) return List.of();
        List<String> raw = new java.util.ArrayList<>();
        if (task.getAssignedCheckerIds() != null && !task.getAssignedCheckerIds().isEmpty()) {
            raw.addAll(task.getAssignedCheckerIds());
        }
        if (task.getSop() != null && task.getSop().getDefaultCheckerIds() != null && !task.getSop().getDefaultCheckerIds().isEmpty()) {
            raw.addAll(task.getSop().getDefaultCheckerIds());
        }
        if (task.getChecker() != null) {
            if (task.getChecker().getUserId() != null) raw.add(task.getChecker().getUserId());
            if (task.getChecker().getEmail() != null) raw.add(task.getChecker().getEmail());
            if (task.getChecker().getFullName() != null) raw.add(task.getChecker().getFullName());
        }

        List<String> resolved = new java.util.ArrayList<>();
        for (String item : raw) {
            if (item != null && !item.isBlank()) {
                String t = item.trim();
                resolved.add(t);
                String r = resolveToUserId(t);
                if (r != null) resolved.add(r);
            }
        }
        return resolved.stream().filter(Objects::nonNull).distinct().toList();
    }

    private boolean isUserAuthorizedToViewTask(Task task, String userId, List<String> accessibleCategories, List<String> readableSubordinates, List<String> writableSubordinates) {
        if (userId == null) return false;

        List<String> makers = getTaskMakerIds(task);
        List<String> checkers = getTaskCheckerIds(task);

        log.info("[isUserAuthorizedToViewTask] task={}, userId={}, makers={}, checkers={}, readableSubs={}, writableSubs={}", 
                task != null ? task.getRecordNo() : null, userId, makers, checkers, readableSubordinates, writableSubordinates);

        // 1. Assigned Maker / Actual Maker
        if (makers.contains(userId)) return true;

        // 2. Assigned Checker / Actual Checker
        if (checkers.contains(userId)) return true;

        // 3. SOP Creator / SOP Approver
        if (task.getSop() != null) {
            if (task.getSop().getCreatedBy() != null && userId.equals(task.getSop().getCreatedBy().getUserId())) return true;
            if (task.getSop().getAssignedCreatorId() != null && userId.equals(task.getSop().getAssignedCreatorId())) return true;
            if (task.getSop().getAssignedCreatorIds() != null && task.getSop().getAssignedCreatorIds().contains(userId)) return true;
            if (task.getSop().getAssignedApproverId() != null && userId.equals(task.getSop().getAssignedApproverId())) return true;
            if (task.getSop().getAssignedApproverIds() != null && task.getSop().getAssignedApproverIds().contains(userId)) return true;
        }

        // 4. Hierarchy Manager (read or write downline access over maker or checker)
        if (!readableSubordinates.isEmpty() || !writableSubordinates.isEmpty()) {
            boolean matchesMaker = makers.stream().anyMatch(m -> readableSubordinates.contains(m) || writableSubordinates.contains(m));
            boolean matchesChecker = checkers.stream().anyMatch(c -> readableSubordinates.contains(c) || writableSubordinates.contains(c));
            if (matchesMaker || matchesChecker) return true;
        }

        // 5. Process Category Access Permission
        if (task.getSop() != null && task.getSop().getProcessCategory() != null) {
            if (accessibleCategories.contains(task.getSop().getProcessCategory())) return true;
        }

        return false;
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
    public TaskDto reassignTask(UUID taskId, TaskReassignRequest request) {
        Task task = getTaskOrThrow(taskId);
        User actor = getUserOrThrow(request.getActorId());

        // Validate Authorization: Must be Admin, SOP Creator, or SOP Approver
        String actorId = actor.getUserId();
        String actorEmail = actor.getEmail();
        String userRole = actor.getRole() != null ? actor.getRole().name() : "";
        boolean isAdmin = "ADMIN".equalsIgnoreCase(userRole);

        Sop sop = task.getSop();
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
        TaskReassignmentHistory historyRecord = TaskReassignmentHistory.builder()
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
        AuditLog auditLog = AuditLog.builder()
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
                notificationPublisherService.publishNotification(NotificationEventDto.builder()
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
                notificationPublisherService.publishNotification(NotificationEventDto.builder()
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
                notificationPublisherService.publishNotification(NotificationEventDto.builder()
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

        List<TaskEvent> rawEvents = taskEventRepository.findByTask_TaskIdOrderByTimestampAsc(task.getTaskId());
        List<TaskComment> rawComments = taskCommentRepository.findByTask_TaskIdOrderByCreatedAtAsc(task.getTaskId());

        List<TaskEventDto> historyList = new java.util.ArrayList<>();
        for (int idx = 0; idx < rawEvents.size(); idx++) {
            TaskEvent e = rawEvents.get(idx);
            String commentText = (idx < rawComments.size()) ? rawComments.get(idx).getCommentText() : null;
            if (commentText == null && !rawComments.isEmpty()) {
                commentText = rawComments.stream()
                    .filter(c -> c.getAuthor().getUserId().equals(e.getActor().getUserId()))
                    .map(TaskComment::getCommentText)
                    .reduce((first, second) -> second)
                    .orElse(null);
            }

            historyList.add(TaskEventDto.builder()
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
            historyList.add(0, TaskEventDto.builder()
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

        List<TaskReassignmentHistory> rawReassignments =
                taskReassignmentHistoryRepository.findByTask_TaskIdOrderByWorkedUntilDesc(task.getTaskId());

        List<TaskReassignmentHistoryDto> reassignList = rawReassignments.stream()
                .map(r -> TaskReassignmentHistoryDto.builder()
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

        List<TaskDocumentDto> documentList = taskDocumentRepository.findByTaskTaskIdOrderByUploadedAtDesc(task.getTaskId()).stream()
                .map(doc -> TaskDocumentDto.builder()
                        .documentId(doc.getDocumentId())
                        .taskId(doc.getTask().getTaskId())
                        .fileName(doc.getFileName())
                        .gcsObjectPath(doc.getGcsObjectPath())
                        .fileSize(doc.getFileSize())
                        .contentType(doc.getContentType())
                        .uploadedById(doc.getUploadedBy() != null ? doc.getUploadedBy().getUserId() : null)
                        .uploadedByName(doc.getUploadedBy() != null ? doc.getUploadedBy().getFullName() : null)
                        .uploadedAt(doc.getUploadedAt())
                        .status(doc.getStatus() != null ? doc.getStatus() : DocumentStatus.PENDING_REVIEW)
                        .rejectionReason(doc.getRejectionReason())
                        .actionedById(doc.getActionedById())
                        .actionedByName(doc.getActionedByName())
                        .actionedAt(doc.getActionedAt())
                        .isResubmission(Boolean.TRUE.equals(doc.getIsResubmission()))
                        .replacedDocumentId(doc.getReplacedDocumentId())
                        .build())
                .toList();

        // Dynamic hierarchy permission calculation for the current requesting user
        TenantContext ctx = TenantContext.getContext();
        String currentUserId = ctx != null ? ctx.getUserId() : null;
        UserRole currentUserRole = ctx != null ? ctx.getUserRole() : null;
        List<String> writableSubs = (ctx != null && ctx.getWritableSubordinateIds() != null) ? ctx.getWritableSubordinateIds() : List.of();
        List<String> readableSubs = (ctx != null && ctx.getReadableSubordinateIds() != null) ? ctx.getReadableSubordinateIds() : List.of();

        boolean isAdmin = currentUserRole == UserRole.ADMIN;

        boolean isAssignedMaker = currentUserId != null && (
            mIds.contains(currentUserId) ||
            (task.getMaker() != null && currentUserId.equals(task.getMaker().getUserId()))
        );

        boolean isManagerWithWriteAccess = currentUserId != null && !writableSubs.isEmpty() && (
            mIds.stream().anyMatch(writableSubs::contains) ||
            (task.getMaker() != null && writableSubs.contains(task.getMaker().getUserId()))
        );

        boolean isSubmittableStatus = task.getStatus() == TaskStatus.OPEN || task.getStatus() == TaskStatus.REJECTED;
        Boolean canUserSubmit = isSubmittableStatus && (isAssignedMaker || isManagerWithWriteAccess || isAdmin);

        boolean isAssignedChecker = currentUserId != null && (
            cIds.contains(currentUserId) ||
            (task.getChecker() != null && currentUserId.equals(task.getChecker().getUserId()))
        );

        boolean isManagerWithReadOrWriteAccess = currentUserId != null && (
            mIds.stream().anyMatch(id -> readableSubs.contains(id) || writableSubs.contains(id)) ||
            cIds.stream().anyMatch(id -> readableSubs.contains(id) || writableSubs.contains(id)) ||
            (task.getMaker() != null && (readableSubs.contains(task.getMaker().getUserId()) || writableSubs.contains(task.getMaker().getUserId())))
        );

        boolean isSelfMaker = currentUserId != null && (
            (task.getMaker() != null && currentUserId.equals(task.getMaker().getUserId())) ||
            mIds.contains(currentUserId)
        );

        boolean isApprovableStatus = task.getStatus() == TaskStatus.PENDING_REVIEW;
        Boolean canUserApprove = isApprovableStatus && (isAssignedChecker || isManagerWithReadOrWriteAccess || isAdmin) && (!isSelfMaker || isAdmin);

        List<com.cloudkaptan.sop.dto.RequiredDocument> reqDocObjects = new ArrayList<>();
        if (task.getTaskTemplateId() != null) {
            taskTemplateRepository.findById(task.getTaskTemplateId())
                .ifPresent(tt -> {
                    if (tt.getRequiredDocuments() != null) {
                        reqDocObjects.addAll(tt.getRequiredDocuments());
                    }
                });
        }

        return TaskDto.builder()
            .taskId(task.getTaskId())
            .version(task.getVersion())
            .recordNo(task.getRecordNo())
            .sopId(task.getSop().getSopId())
            .sopTitle(task.getSop().getTitle())
            .sopCode(task.getSop().getSopCode())
            .categoryCode(task.getSop().getProcessCategory())
            .categoryName(task.getSop().getProcessCategory() != null ? 
                processCategoryRepository.findByCategoryCode(task.getSop().getProcessCategory())
                    .map(ProcessCategory::getCategoryName)
                    .orElse(task.getSop().getProcessCategory()) : null)
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
            .startDate(task.getStartDate() != null ? task.getStartDate()
                : (task.getSop() != null && task.getSop().getStartDate() != null ? task.getSop().getStartDate()
                : (task.getSopVersion() != null && task.getSopVersion().getStartDateTime() != null ? task.getSopVersion().getStartDateTime().toLocalDate() : entityToday)))
            .dueDate(task.getDueDate() != null ? task.getDueDate()
                : (task.getSop() != null && task.getSop().getDueDate() != null ? task.getSop().getDueDate()
                : (task.getSopVersion() != null && task.getSopVersion().getDueDateTime() != null ? task.getSopVersion().getDueDateTime().toLocalDate() : entityToday.plusDays(7))))
            .daysOverdue(daysOverdue)
            .completedAt(task.getCompletedAt())
            .approvedAt(task.getApprovedAt())
            .createdAt(task.getCreatedAt())
            .sopCreatedBy(task.getSop() != null && task.getSop().getCreatedBy() != null ? task.getSop().getCreatedBy().getUserId() : (task.getSop() != null ? task.getSop().getAssignedCreatorId() : null))
            .sopAssignedCreatorIds(creatorList.stream().filter(Objects::nonNull).distinct().toList())
            .sopAssignedApproverIds(approverList.stream().filter(Objects::nonNull).distinct().toList())
            .canUserSubmit(canUserSubmit)
            .canUserApprove(canUserApprove)
            .history(historyList)
            .reassignmentHistory(reassignList)
            .documents(documentList)
            .requiredDocuments(reqDocObjects)
            .build();
    }
}

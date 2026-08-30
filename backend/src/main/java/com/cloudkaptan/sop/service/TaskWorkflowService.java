package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.state.TaskContext;
import com.cloudkaptan.sop.dto.TaskDto;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskWorkflowService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final com.cloudkaptan.sop.repository.AuditLogRepository auditLogRepository;

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
        return mapToDto(saved);
    }

    @Transactional
    public TaskDto approveTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED) {
            throw new IllegalStateException("Task is locked and has already been reviewed by " + (task.getChecker() != null ? task.getChecker().getFullName() : "another Checker"));
        }

        User actor = getUserOrThrow(actorId);
        task.setChecker(actor);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.approve(actor, comment);

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), "APPROVE", comment));
        return mapToDto(saved);
    }

    @Transactional
    public TaskDto rejectTask(UUID taskId, String actorId, String comment, Boolean permanentRejection) {
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new IllegalStateException("Task is locked and has already been reviewed by " + (task.getChecker() != null ? task.getChecker().getFullName() : "another Checker"));
        }

        User actor = getUserOrThrow(actorId);
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

    @Transactional(readOnly = true)
    public List<TaskDto> getTasks(List<EntityCode> entities) {
        return taskRepository.findTasksByEntities(entities).stream()
            .map(this::mapToDto)
            .toList();
    }

    private Task getTaskOrThrow(UUID taskId) {
        return taskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
    }

    public TaskDto mapToDto(Task task) {
        long daysOverdue = 0;
        if (task.getDueDate() != null && LocalDate.now().isAfter(task.getDueDate()) && task.getStatus() != TaskStatus.APPROVED) {
            daysOverdue = ChronoUnit.DAYS.between(task.getDueDate(), LocalDate.now());
        }

        UUID sopId = task.getSop().getSopId();
        List<String> mIds = SopService.makerPoolMap.getOrDefault(sopId, List.of(task.getMaker().getUserId()));
        List<String> mNames = mIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(task.getMaker().getFullName()))
            .toList();

        List<String> cIds = SopService.checkerPoolMap.getOrDefault(sopId, List.of(task.getChecker().getUserId()));
        List<String> cNames = cIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(task.getChecker().getFullName()))
            .toList();

        String actualMakerName = (task.getStatus() == TaskStatus.PENDING_REVIEW || task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED)
            ? task.getMaker().getFullName() : null;

        String actualCheckerName = (task.getStatus() == TaskStatus.APPROVED || task.getStatus() == TaskStatus.REJECTED || task.getStatus() == TaskStatus.PERMANENTLY_REJECTED)
            ? task.getChecker().getFullName() : null;

        return TaskDto.builder()
            .taskId(task.getTaskId())
            .version(task.getVersion())
            .recordNo(task.getRecordNo())
            .sopId(sopId)
            .sopTitle(task.getSop().getTitle())
            .sopCode(task.getSop().getSopCode())
            .periodKey(task.getPeriodKey())
            .entityCode(task.getEntity().getEntityCode())
            .entityName(task.getEntity().getEntityName())
            .makerId(task.getMaker().getUserId())
            .makerName(task.getMaker().getFullName())
            .assignedMakerIds(mIds)
            .assignedMakerNames(mNames)
            .actualMakerId(task.getMaker().getUserId())
            .actualMakerName(actualMakerName)
            .checkerId(task.getChecker().getUserId())
            .checkerName(task.getChecker().getFullName())
            .assignedCheckerIds(cIds)
            .assignedCheckerNames(cNames)
            .actualCheckerId(task.getChecker().getUserId())
            .actualCheckerName(actualCheckerName)
            .status(task.getStatus())
            .dueDate(task.getDueDate())
            .daysOverdue(daysOverdue)
            .completedAt(task.getCompletedAt())
            .approvedAt(task.getApprovedAt())
            .createdAt(task.getCreatedAt())
            .build();
    }
}

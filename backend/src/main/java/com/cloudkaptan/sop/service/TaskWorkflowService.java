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

    @Transactional
    public TaskDto submitTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        User actor = getUserOrThrow(actorId);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.submit(actor, comment);

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), "SUBMIT", comment));
        return mapToDto(saved);
    }

    @Transactional
    public TaskDto approveTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        User actor = getUserOrThrow(actorId);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.approve(actor, comment);

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), "APPROVE", comment));
        return mapToDto(saved);
    }

    @Transactional
    public TaskDto rejectTask(UUID taskId, String actorId, String comment) {
        Task task = getTaskOrThrow(taskId);
        User actor = getUserOrThrow(actorId);
        TaskStatus fromStatus = task.getStatus();

        TaskContext context = new TaskContext(task);
        context.reject(actor, comment);

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(saved, actor, fromStatus, saved.getStatus(), "REJECT", comment));
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
            .makerId(task.getMaker().getUserId())
            .makerName(task.getMaker().getFullName())
            .checkerId(task.getChecker().getUserId())
            .checkerName(task.getChecker().getFullName())
            .status(task.getStatus())
            .dueDate(task.getDueDate())
            .daysOverdue(daysOverdue)
            .completedAt(task.getCompletedAt())
            .approvedAt(task.getApprovedAt())
            .createdAt(task.getCreatedAt())
            .build();
    }
}

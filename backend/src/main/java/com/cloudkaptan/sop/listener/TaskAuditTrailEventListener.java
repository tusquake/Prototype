package com.cloudkaptan.sop.listener;

import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.TaskComment;
import com.cloudkaptan.sop.entity.TaskEvent;
import com.cloudkaptan.sop.event.TaskStatusChangedEvent;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.TaskCommentRepository;
import com.cloudkaptan.sop.repository.TaskEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TaskAuditTrailEventListener {

    private final TaskEventRepository taskEventRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final AuditLogRepository auditLogRepository;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onTaskStatusChanged(TaskStatusChangedEvent event) {
        TaskEvent taskEvent = TaskEvent.builder()
            .task(event.task())
            .actor(event.actor())
            .action(event.action())
            .fromStatus(event.fromStatus())
            .toStatus(event.toStatus())
            .build();
        taskEventRepository.save(taskEvent);

        if (event.comment() != null && !event.comment().isBlank()) {
            TaskComment comment = TaskComment.builder()
                .task(event.task())
                .author(event.actor())
                .commentText(event.comment())
                .build();
            taskCommentRepository.save(comment);
        }

        AuditLog auditLog = AuditLog.builder()
            .actorId(event.actor().getUserId())
            .action(event.action())
            .entityType("TASK")
            .entityId(event.task().getTaskId().toString())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);
    }
}

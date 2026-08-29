package com.cloudkaptan.sop.listener;

import com.cloudkaptan.sop.event.TaskStatusChangedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
public class TaskNotificationEventListener {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskStatusChanged(TaskStatusChangedEvent event) {
        log.info("Non-blocking Async Notification: Task [{}] status transitioned from [{}] to [{}] by User [{}]",
            event.task().getRecordNo(), event.fromStatus(), event.toStatus(), event.actor().getUserId());
    }
}

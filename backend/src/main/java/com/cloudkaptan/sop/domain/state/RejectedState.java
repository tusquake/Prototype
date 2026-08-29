package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

import java.time.OffsetDateTime;

public class RejectedState implements TaskState {

    @Override
    public void submit(TaskContext context, User actor, String comment) {
        Task task = context.getTask();
        task.setStatus(TaskStatus.PENDING_REVIEW);
        task.setCompletedAt(OffsetDateTime.now());
        context.setState(new PendingReviewState());
    }

    @Override
    public void approve(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Cannot approve a REJECTED task directly. Resubmit for review first.");
    }

    @Override
    public void reject(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Task is already in REJECTED status.");
    }
}

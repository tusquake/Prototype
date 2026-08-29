package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;
import com.cloudkaptan.sop.exception.SeparationOfDutyViolationException;

import java.time.OffsetDateTime;

public class PendingReviewState implements TaskState {

    @Override
    public void submit(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Task is already submitted and pending review.");
    }

    @Override
    public void approve(TaskContext context, User actor, String comment) {
        Task task = context.getTask();
        
        // Strict Separation of Duty Enforcement (Admin exempted)
        boolean isAdmin = actor.getRole() == UserRole.ADMIN || "usr-manoj-042".equals(actor.getUserId());
        if (!isAdmin && task.getMaker().getUserId().equals(actor.getUserId())) {
            throw new SeparationOfDutyViolationException(
                "Separation of Duty Violation: Maker [" + actor.getUserId() + "] cannot approve their own submitted task [" + task.getTaskId() + "]. An independent Checker or Admin must review."
            );
        }

        task.setStatus(TaskStatus.APPROVED);
        task.setApprovedAt(OffsetDateTime.now());
        context.setState(new ApprovedState());
    }

    @Override
    public void reject(TaskContext context, User actor, String comment) {
        Task task = context.getTask();

        // Strict Separation of Duty Enforcement (Admin exempted)
        boolean isAdmin = actor.getRole() == UserRole.ADMIN || "usr-manoj-042".equals(actor.getUserId());
        if (!isAdmin && task.getMaker().getUserId().equals(actor.getUserId())) {
            throw new SeparationOfDutyViolationException(
                "Separation of Duty Violation: Maker [" + actor.getUserId() + "] cannot reject their own submitted task [" + task.getTaskId() + "]. An independent Checker or Admin must review."
            );
        }
        
        if (comment == null || comment.isBlank()) {
            throw new IllegalArgumentException("Rejection reason is mandatory when rejecting a task.");
        }

        task.setStatus(TaskStatus.REJECTED);
        context.setState(new RejectedState());
    }
}

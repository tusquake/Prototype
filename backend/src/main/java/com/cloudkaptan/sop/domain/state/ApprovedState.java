package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

public class ApprovedState implements TaskState {

    @Override
    public void submit(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is already APPROVED and cannot be resubmitted.");
    }

    @Override
    public void approve(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is already APPROVED.");
    }

    @Override
    public void reject(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is already APPROVED and cannot be rejected.");
    }
}

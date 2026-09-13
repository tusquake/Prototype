package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

public class PermanentlyRejectedState implements TaskState {

    @Override
    public void submit(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is PERMANENTLY_REJECTED and cannot be submitted.");
    }

    @Override
    public void approve(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is PERMANENTLY_REJECTED and cannot be approved.");
    }

    @Override
    public void reject(TaskContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Terminal State Violation: Task is PERMANENTLY_REJECTED and cannot be rejected.");
    }
}

package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

public class RejectedSopState implements SopState {

    @Override
    public void submitForApproval(SopContext context, User actor) {
        String assignedCreator = context.getSop().getAssignedCreatorId();
        if (assignedCreator != null && !assignedCreator.isBlank() && actor != null && !assignedCreator.equals(actor.getUserId())) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not the assigned creator [%s] for this SOP.", actor.getUserId(), assignedCreator)
            );
        }
        context.transitionTo(new PendingApprovalSopState());
    }

    @Override
    public void approve(SopContext context, User actor) {
        throw new IllegalStateTransitionException("Cannot approve REJECTED SOP directly. Creator must revise and submit for approval first.");
    }

    @Override
    public void reject(SopContext context, User actor, String reason) {
        throw new IllegalStateTransitionException("SOP is already REJECTED.");
    }

    @Override
    public SopStatus getStatus() {
        return SopStatus.REJECTED;
    }
}

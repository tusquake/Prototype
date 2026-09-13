package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

import java.util.List;

public class PendingCreationSopState implements SopState {

    @Override
    public void submitForApproval(SopContext context, User actor) {
        List<String> creatorPool = context.getSop().getAssignedCreatorIds();
        boolean isAssignedCreator = (creatorPool != null && !creatorPool.isEmpty())
            ? creatorPool.contains(actor != null ? actor.getUserId() : null)
            : (context.getSop().getAssignedCreatorId() != null && actor != null && context.getSop().getAssignedCreatorId().equals(actor.getUserId()));

        if (actor != null && !isAssignedCreator && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not an assigned creator for this SOP.", actor.getUserId())
            );
        }
        context.transitionTo(new PendingApprovalSopState());
    }

    @Override
    public void approve(SopContext context, User actor) {
        throw new IllegalStateTransitionException("Cannot approve SOP in PENDING_CREATION state. SOP draft must be submitted first.");
    }

    @Override
    public void reject(SopContext context, User actor, String reason) {
        throw new IllegalStateTransitionException("Cannot reject SOP in PENDING_CREATION state. SOP draft must be submitted first.");
    }

    @Override
    public SopStatus getStatus() {
        return SopStatus.PENDING_CREATION;
    }
}

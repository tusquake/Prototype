package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

import java.util.List;

public class PendingApprovalSopState implements SopState {

    @Override
    public void submitForApproval(SopContext context, User actor) {
        throw new IllegalStateTransitionException("SOP is already submitted and pending approval.");
    }

    @Override
    public void approve(SopContext context, User actor) {
        List<String> approverPool = context.getSop().getAssignedApproverIds();
        boolean isAssignedApprover = (approverPool != null && !approverPool.isEmpty())
            ? approverPool.contains(actor != null ? actor.getUserId() : null)
            : (context.getSop().getAssignedApproverId() != null && actor != null && context.getSop().getAssignedApproverId().equals(actor.getUserId()));

        if (actor != null && !isAssignedApprover && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not an assigned approver for this SOP.", actor.getUserId())
            );
        }
        context.getSop().setRejectionReason(null);
        context.transitionTo(new ActiveSopState());
    }

    @Override
    public void reject(SopContext context, User actor, String reason) {
        List<String> approverPool = context.getSop().getAssignedApproverIds();
        boolean isAssignedApprover = (approverPool != null && !approverPool.isEmpty())
            ? approverPool.contains(actor != null ? actor.getUserId() : null)
            : (context.getSop().getAssignedApproverId() != null && actor != null && context.getSop().getAssignedApproverId().equals(actor.getUserId()));

        if (actor != null && !isAssignedApprover && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not an assigned approver for this SOP.", actor.getUserId())
            );
        }
        context.getSop().setRejectionReason(reason);
        context.transitionTo(new RejectedSopState());
    }

    @Override
    public SopStatus getStatus() {
        return SopStatus.PENDING_APPROVAL;
    }
}

package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

public class PendingApprovalSopState implements SopState {

    @Override
    public void submitForApproval(SopContext context, User actor) {
        throw new IllegalStateTransitionException("SOP is already submitted and pending approval.");
    }

    @Override
    public void approve(SopContext context, User actor) {
        String assignedApprover = context.getSop().getAssignedApproverId();
        if (assignedApprover != null && !assignedApprover.isBlank() && actor != null 
            && !assignedApprover.equals(actor.getUserId()) 
            && actor.getRole() != com.cloudkaptan.sop.domain.enums.UserRole.ADMIN) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not the assigned approver [%s] for this SOP.", actor.getUserId(), assignedApprover)
            );
        }
        context.getSop().setRejectionReason(null);
        context.transitionTo(new ActiveSopState());
    }

    @Override
    public void reject(SopContext context, User actor, String reason) {
        String assignedApprover = context.getSop().getAssignedApproverId();
        if (assignedApprover != null && !assignedApprover.isBlank() && actor != null 
            && !assignedApprover.equals(actor.getUserId()) 
            && actor.getRole() != com.cloudkaptan.sop.domain.enums.UserRole.ADMIN) {
            throw new IllegalStateTransitionException(
                String.format("User [%s] is not the assigned approver [%s] for this SOP.", actor.getUserId(), assignedApprover)
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

package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

public class ActiveSopState implements SopState {

    @Override
    public void submitForApproval(SopContext context, User actor) {
        throw new IllegalStateTransitionException("SOP is already ACTIVE and approved.");
    }

    @Override
    public void approve(SopContext context, User actor) {
        throw new IllegalStateTransitionException("SOP is already in ACTIVE state.");
    }

    @Override
    public void reject(SopContext context, User actor, String reason) {
        throw new IllegalStateTransitionException("Cannot reject an ACTIVE approved SOP.");
    }

    @Override
    public SopStatus getStatus() {
        return SopStatus.ACTIVE;
    }
}

package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.User;
import lombok.Getter;

@Getter
public class SopContext {

    private final Sop sop;
    private SopState currentState;

    public SopContext(Sop sop, SopState initialState) {
        this.sop = sop;
        this.currentState = initialState;
    }

    public void transitionTo(SopState nextState) {
        this.currentState = nextState;
        this.sop.setStatus(nextState.getStatus());
    }

    public void submitForApproval(User actor) {
        this.currentState.submitForApproval(this, actor);
    }

    public void approve(User actor) {
        this.currentState.approve(this, actor);
    }

    public void reject(User actor, String reason) {
        this.currentState.reject(this, actor, reason);
    }
}

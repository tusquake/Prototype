package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.entity.SopTemplate;
import lombok.Getter;

@Getter
public class SopTemplateContext {
    private final SopTemplate sopTemplate;
    private SopTemplateState state;

    public SopTemplateContext(SopTemplate sopTemplate) {
        this.sopTemplate = sopTemplate;
        this.state = SopTemplateStateMachineFactory.getState(sopTemplate.getStatus());
    }

    public void submitForApproval(String actorId) {
        state.submitForApproval(this, actorId);
    }

    public void approve() {
        state.approve(this);
    }

    public void reject(String comment) {
        state.reject(this, comment);
    }

    public void deactivate() {
        state.deactivate(this);
    }

    public void setState(SopTemplateState state) {
        this.state = state;
        if (sopTemplate != null) {
            sopTemplate.setStatus(state.getStatus());
        }
    }
}

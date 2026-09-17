package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;

public class ActiveSopTemplateState implements SopTemplateState {

    @Override
    public SopTemplateStatus getStatus() {
        return SopTemplateStatus.ACTIVE;
    }

    @Override
    public void submitForApproval(SopTemplateContext context, String actorId) {
        throw new IllegalStateException("Template is already ACTIVE.");
    }

    @Override
    public void approve(SopTemplateContext context) {
        throw new IllegalStateException("Template is already ACTIVE.");
    }

    @Override
    public void reject(SopTemplateContext context, String comment) {
        throw new IllegalStateException("Cannot reject an ACTIVE template. Deactivate it first.");
    }

    @Override
    public void deactivate(SopTemplateContext context) {
        context.setState(new DeactivatedSopTemplateState());
    }
}

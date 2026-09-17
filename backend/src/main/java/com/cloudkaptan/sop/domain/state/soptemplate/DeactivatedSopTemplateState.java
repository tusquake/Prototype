package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;

public class DeactivatedSopTemplateState implements SopTemplateState {

    @Override
    public SopTemplateStatus getStatus() {
        return SopTemplateStatus.DEACTIVATED;
    }

    @Override
    public void submitForApproval(SopTemplateContext context, String actorId) {
        context.setState(new PendingApprovalSopTemplateState());
    }

    @Override
    public void approve(SopTemplateContext context) {
        context.setState(new ActiveSopTemplateState());
    }

    @Override
    public void reject(SopTemplateContext context, String comment) {
        throw new IllegalStateException("Cannot reject a DEACTIVATED template.");
    }

    @Override
    public void deactivate(SopTemplateContext context) {
        throw new IllegalStateException("Template is already DEACTIVATED.");
    }
}

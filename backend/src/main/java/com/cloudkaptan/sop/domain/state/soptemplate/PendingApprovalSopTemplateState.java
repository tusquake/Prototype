package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;

public class PendingApprovalSopTemplateState implements SopTemplateState {

    @Override
    public SopTemplateStatus getStatus() {
        return SopTemplateStatus.PENDING_APPROVAL;
    }

    @Override
    public void submitForApproval(SopTemplateContext context, String actorId) {
        throw new IllegalStateException("Template is already PENDING_APPROVAL.");
    }

    @Override
    public void approve(SopTemplateContext context) {
        context.setState(new ActiveSopTemplateState());
    }

    @Override
    public void reject(SopTemplateContext context, String comment) {
        context.setState(new RejectedSopTemplateState());
    }

    @Override
    public void deactivate(SopTemplateContext context) {
        throw new IllegalStateException("Cannot deactivate a template while PENDING_APPROVAL.");
    }
}

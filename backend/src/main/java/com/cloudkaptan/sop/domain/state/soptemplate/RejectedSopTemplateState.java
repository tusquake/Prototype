package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.entity.SopTemplate;

public class RejectedSopTemplateState implements SopTemplateState {

    @Override
    public SopTemplateStatus getStatus() {
        return SopTemplateStatus.REJECTED;
    }

    @Override
    public void submitForApproval(SopTemplateContext context, String actorId) {
        SopTemplate template = context.getSopTemplate();
        if (template.getTaskTemplates().isEmpty()) {
            throw new IllegalStateException("Cannot re-submit a template for approval with no task steps defined.");
        }
        if (template.getDefaultMakerIds().isEmpty() || template.getDefaultCheckerIds().isEmpty()) {
            throw new IllegalStateException("Cannot re-submit a template without at least one Maker and one Checker assigned.");
        }
        context.setState(new PendingApprovalSopTemplateState());
    }

    @Override
    public void approve(SopTemplateContext context) {
        throw new IllegalStateException("Cannot directly approve a REJECTED template. It must be revised and re-submitted first.");
    }

    @Override
    public void reject(SopTemplateContext context, String comment) {
        throw new IllegalStateException("Template is already REJECTED.");
    }

    @Override
    public void deactivate(SopTemplateContext context) {
        throw new IllegalStateException("Cannot deactivate a REJECTED template.");
    }
}

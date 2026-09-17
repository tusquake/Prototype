package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;

public interface SopTemplateState {
    SopTemplateStatus getStatus();
    void submitForApproval(SopTemplateContext context, String actorId);
    void approve(SopTemplateContext context);
    void reject(SopTemplateContext context, String comment);
    void deactivate(SopTemplateContext context);
}

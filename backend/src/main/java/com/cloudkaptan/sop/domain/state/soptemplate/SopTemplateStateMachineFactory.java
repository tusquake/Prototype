package com.cloudkaptan.sop.domain.state.soptemplate;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;

public class SopTemplateStateMachineFactory {

    public static SopTemplateState getState(SopTemplateStatus status) {
        if (status == null) {
            return new DraftSopTemplateState();
        }
        return switch (status) {
            case DRAFT -> new DraftSopTemplateState();
            case PENDING_APPROVAL -> new PendingApprovalSopTemplateState();
            case ACTIVE -> new ActiveSopTemplateState();
            case DEACTIVATED -> new DeactivatedSopTemplateState();
            case REJECTED -> new RejectedSopTemplateState();
        };
    }
}

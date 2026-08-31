package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;

public class SopStateMachineFactory {

    public static SopState getState(SopStatus status) {
        if (status == null) {
            return new PendingCreationSopState();
        }
        return switch (status) {
            case PENDING_CREATION, DRAFT -> new PendingCreationSopState();
            case PENDING_APPROVAL -> new PendingApprovalSopState();
            case ACTIVE -> new ActiveSopState();
            case REJECTED -> new RejectedSopState();
            case ARCHIVED -> new ActiveSopState();
        };
    }
}

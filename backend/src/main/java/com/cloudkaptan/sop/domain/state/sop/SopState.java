package com.cloudkaptan.sop.domain.state.sop;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.entity.User;

public interface SopState {

    void submitForApproval(SopContext context, User actor);

    void approve(SopContext context, User actor);

    void reject(SopContext context, User actor, String reason);

    SopStatus getStatus();
}

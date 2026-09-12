package com.cloudkaptan.sop.domain.state.document;

import com.cloudkaptan.sop.entity.User;

public interface DocumentState {

    void approve(DocumentContext context, User actor);

    void reject(DocumentContext context, User actor, String comment);

    void resubmit(DocumentContext context, User actor);
}

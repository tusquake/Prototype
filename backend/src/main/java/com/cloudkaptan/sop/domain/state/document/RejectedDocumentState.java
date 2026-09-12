package com.cloudkaptan.sop.domain.state.document;

import com.cloudkaptan.sop.domain.enums.DocumentStatus;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

import java.time.OffsetDateTime;

public class RejectedDocumentState implements DocumentState {

    @Override
    public void approve(DocumentContext context, User actor) {
        throw new IllegalStateTransitionException("Cannot directly approve a rejected document. Maker must re-upload/resubmit the evidence file first.");
    }

    @Override
    public void reject(DocumentContext context, User actor, String comment) {
        throw new IllegalStateTransitionException("Document is already rejected.");
    }

    @Override
    public void resubmit(DocumentContext context, User actor) {
        TaskDocument document = context.getDocument();
        document.setStatus(DocumentStatus.PENDING_REVIEW);
        document.setRejectionReason(null);
        document.setActionedById(actor.getUserId());
        document.setActionedByName(actor.getFullName());
        document.setActionedAt(OffsetDateTime.now());
        context.setState(new PendingReviewDocumentState());
    }
}

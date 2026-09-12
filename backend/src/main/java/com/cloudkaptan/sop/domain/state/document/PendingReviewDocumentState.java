package com.cloudkaptan.sop.domain.state.document;

import com.cloudkaptan.sop.domain.enums.DocumentStatus;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.IllegalStateTransitionException;

import java.time.OffsetDateTime;

public class PendingReviewDocumentState implements DocumentState {

    @Override
    public void approve(DocumentContext context, User actor) {
        TaskDocument document = context.getDocument();
        document.setStatus(DocumentStatus.APPROVED);
        document.setRejectionReason(null);
        document.setActionedById(actor.getUserId());
        document.setActionedByName(actor.getFullName());
        document.setActionedAt(OffsetDateTime.now());
        context.setState(new ApprovedDocumentState());
    }

    @Override
    public void reject(DocumentContext context, User actor, String comment) {
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason comment is mandatory when rejecting a document.");
        }
        TaskDocument document = context.getDocument();
        document.setStatus(DocumentStatus.REJECTED);
        document.setRejectionReason(comment.trim());
        document.setActionedById(actor.getUserId());
        document.setActionedByName(actor.getFullName());
        document.setActionedAt(OffsetDateTime.now());
        context.setState(new RejectedDocumentState());
    }

    @Override
    public void resubmit(DocumentContext context, User actor) {
        throw new IllegalStateTransitionException("Document is already pending review.");
    }
}

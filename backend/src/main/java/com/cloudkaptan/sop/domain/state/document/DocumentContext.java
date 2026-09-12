package com.cloudkaptan.sop.domain.state.document;

import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.entity.User;
import lombok.Getter;
import lombok.Setter;

@Getter
public class DocumentContext {

    private final TaskDocument document;

    @Setter
    private DocumentState state;

    public DocumentContext(TaskDocument document) {
        this.document = document;
        this.state = switch (document.getStatus() != null ? document.getStatus() : com.cloudkaptan.sop.domain.enums.DocumentStatus.PENDING_REVIEW) {
            case PENDING_REVIEW -> new PendingReviewDocumentState();
            case APPROVED -> new ApprovedDocumentState();
            case REJECTED -> new RejectedDocumentState();
        };
    }

    public void approve(User actor) {
        state.approve(this, actor);
    }

    public void reject(User actor, String comment) {
        state.reject(this, actor, comment);
    }

    public void resubmit(User actor) {
        state.resubmit(this, actor);
    }
}

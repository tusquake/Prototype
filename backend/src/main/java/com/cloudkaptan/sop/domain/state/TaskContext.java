package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import lombok.Getter;
import lombok.Setter;

@Getter
public class TaskContext {

    private final Task task;

    @Setter
    private TaskState state;

    public TaskContext(Task task) {
        this.task = task;
        this.state = switch (task.getStatus()) {
            case OPEN -> new OpenState();
            case PENDING_REVIEW -> new PendingReviewState();
            case APPROVED -> new ApprovedState();
            case REJECTED -> new RejectedState();
            case PERMANENTLY_REJECTED -> new ApprovedState();
        };
    }

    public void submit(User actor, String comment) {
        state.submit(this, actor, comment);
    }

    public void approve(User actor, String comment) {
        state.approve(this, actor, comment);
    }

    public void reject(User actor, String comment) {
        state.reject(this, actor, comment);
    }
}

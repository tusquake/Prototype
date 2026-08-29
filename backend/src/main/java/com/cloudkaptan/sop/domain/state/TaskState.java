package com.cloudkaptan.sop.domain.state;

import com.cloudkaptan.sop.entity.User;

public interface TaskState {

    void submit(TaskContext context, User actor, String comment);

    void approve(TaskContext context, User actor, String comment);

    void reject(TaskContext context, User actor, String comment);
}

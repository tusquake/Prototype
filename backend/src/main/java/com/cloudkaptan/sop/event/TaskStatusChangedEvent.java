package com.cloudkaptan.sop.event;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;

public record TaskStatusChangedEvent(
    Task task,
    User actor,
    TaskStatus fromStatus,
    TaskStatus toStatus,
    String action,
    String comment
) {}

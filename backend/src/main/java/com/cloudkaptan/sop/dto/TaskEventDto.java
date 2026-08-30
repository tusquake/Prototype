package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskEventDto {
    private Long eventId;
    private String actorId;
    private String actorName;
    private String action;
    private TaskStatus fromStatus;
    private TaskStatus toStatus;
    private String comment;
    private OffsetDateTime timestamp;
}

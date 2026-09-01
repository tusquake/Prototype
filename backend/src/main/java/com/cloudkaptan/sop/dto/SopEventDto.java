package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SopEventDto {
    private Long eventId;
    private String action;
    private String fromStatus;
    private String toStatus;
    private String actorId;
    private String actorName;
    private String actorRole;
    private String comment;
    private OffsetDateTime timestamp;
}

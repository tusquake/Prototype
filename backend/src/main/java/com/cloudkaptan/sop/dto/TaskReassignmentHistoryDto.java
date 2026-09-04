package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskReassignmentHistoryDto {
    private UUID historyId;
    private UUID taskId;
    private String previousMakerNames;
    private String newMakerNames;
    private String previousCheckerNames;
    private String newCheckerNames;
    private String reassignedById;
    private String reassignedByName;
    private OffsetDateTime workedUntil;
    private String reason;
    private OffsetDateTime createdAt;
}

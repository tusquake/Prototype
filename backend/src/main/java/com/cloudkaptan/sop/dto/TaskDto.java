package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private UUID taskId;
    private Long version;
    private String recordNo;
    private UUID sopId;
    private String sopTitle;
    private String sopCode;
    private String periodKey;
    private EntityCode entityCode;
    private String entityName;
    private String makerId;
    private String makerName;
    private java.util.List<String> assignedMakerIds;
    private java.util.List<String> assignedMakerNames;
    private String actualMakerId;
    private String actualMakerName;

    private String checkerId;
    private String checkerName;
    private java.util.List<String> assignedCheckerIds;
    private java.util.List<String> assignedCheckerNames;
    private String actualCheckerId;
    private String actualCheckerName;

    private TaskStatus status;
    private LocalDate dueDate;
    private Long daysOverdue;
    private OffsetDateTime completedAt;
    private OffsetDateTime approvedAt;
    private OffsetDateTime createdAt;
}

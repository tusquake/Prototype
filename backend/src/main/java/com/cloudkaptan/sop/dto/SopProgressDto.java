package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class SopProgressDto {

    private UUID sopId;
    private String sopCode;
    private String title;
    private String entity;
    private EntityCode entityCode;
    private SopStatus status;
    private String frequency;

    /** Total number of tasks under this SOP */
    private long totalTasks;

    /** Tasks in APPROVED state */
    private long completedTasks;

    /** Tasks in PENDING_REVIEW or DRAFT/IN_PROGRESS state (not yet approved) */
    private long pendingTasks;

    /** Tasks where dueDate is past today and status != APPROVED */
    private long overdueTasks;

    /** Integer 0-100 representing overall completion percentage */
    private int progressPercent;

    private LocalDate dueDate;
    private LocalDate startDate;
}

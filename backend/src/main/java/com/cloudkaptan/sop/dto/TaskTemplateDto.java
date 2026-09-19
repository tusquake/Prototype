package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplateDto {

    private UUID taskTemplateId;
    private UUID templateId;
    private Integer stepSequence;
    private String taskName;
    private String description;
    private String dependencyMode;
    private String priority;

    /**
     * "Target Start: Day N from SOP start"
     */
    private Integer etaStartDay;

    /**
     * "Completion Deadline: By Day N from SOP start"
     */
    private Integer etaEndDay;

    /**
     * Relative calculated day offsets for sequential blueprint steps
     */
    private Integer calculatedStartDay;
    private Integer calculatedEndDay;

    private Integer slaHours;
    private List<String> makerIds;
    private List<String> checkerIds;
    private List<RequiredDocument> requiredDocuments;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

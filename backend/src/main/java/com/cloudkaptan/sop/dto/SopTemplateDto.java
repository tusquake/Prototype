package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SopTemplateDto {

    private UUID templateId;
    private String templateCode;
    private String title;
    private String description;
    private String processCategory;
    private String entityCode;
    private SopFrequency frequency;
    private Boolean isRecurring;
    private String recurrenceConfig;
    private Integer dueDayOffset;
    private LocalDate effectiveFrom;
    private LocalDate effectiveUntil;
    private SopTemplateStatus status;
    private List<String> defaultMakerIds;
    private List<String> defaultCheckerIds;
    private List<TaskTemplateDto> taskTemplates;
    private String createdById;
    private List<String> assignedApproverIds;
    private List<String> assignedApproverNames;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

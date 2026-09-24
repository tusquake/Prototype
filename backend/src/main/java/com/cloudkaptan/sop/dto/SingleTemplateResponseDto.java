package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response payload containing single created/updated SOP Template details")
public class SingleTemplateResponseDto {

    private UUID templateId;
    private String templateCode;
    private String title;
    private String description;
    private String processCategory;
    private EntityCode entityCode;
    private SopFrequency frequency;
    private SopTemplateStatus status;
    private String recurrenceConfig;
    private Integer dueDayOffset;
    private LocalDate effectiveFrom;
    private List<String> defaultMakerIds;
    private List<String> defaultCheckerIds;
    private UUID taskTemplateId;
    private String createdById;
    private boolean newlyCreated;
    private boolean overwritten;
    private String message;
}

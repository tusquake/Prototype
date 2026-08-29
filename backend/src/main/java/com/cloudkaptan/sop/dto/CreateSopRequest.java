package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSopRequest {

    @NotBlank(message = "SOP code is required")
    private String sopCode;

    @NotBlank(message = "SOP title is required")
    private String title;

    private String description;

    @NotBlank(message = "Process category is required")
    private String processCategory;

    @NotNull(message = "Corporate entity is required")
    private EntityCode entityCode;

    @NotNull(message = "Recurrence frequency is required")
    private SopFrequency frequency;

    @NotNull(message = "Due day offset is required")
    @Min(value = 1, message = "Due day offset must be at least 1")
    private Integer dueDayOffset;

    @NotBlank(message = "Default maker ID is required")
    private String defaultMakerId;

    @NotBlank(message = "Default checker ID is required")
    private String defaultCheckerId;

    @NotBlank(message = "Created by user ID is required")
    private String createdById;
}

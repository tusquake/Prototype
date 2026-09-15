package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSopTemplateRequest {

    @NotBlank(message = "Template code is required")
    private String templateCode;

    @NotBlank(message = "Template title is required")
    private String title;

    private String description;

    @NotBlank(message = "Process category is required")
    private String processCategory;

    @NotNull(message = "Corporate entity is required")
    private EntityCode entityCode;

    @NotNull(message = "Recurrence frequency is required")
    private SopFrequency frequency;

    private Boolean isRecurring;

    /**
     * JSON string describing the recurrence pattern.
     * Weekly:    {"weekdays":["MON","WED","FRI"]}
     * Monthly:   {"dayOfMonth":15}
     * Quarterly: {"months":["JAN","APR","JUL","OCT"],"dayOfMonth":1}
     * Annual:    {"monthOfYear":"MAR","dayOfMonth":31}
     */
    private String recurrenceConfig;

    @Min(value = 0, message = "Due day offset must be at least 0")
    private Integer dueDayOffset;

    /**
     * When the scheduler starts generating SOP instances from this template.
     */
    @NotNull(message = "Effective From date is required")
    private LocalDate effectiveFrom;

    /**
     * When the template retires. Null = indefinite.
     */
    private LocalDate effectiveUntil;

    @NotBlank(message = "Created by user ID is required")
    private String createdById;

    @Builder.Default
    private List<String> defaultMakerIds = new ArrayList<>();

    @Builder.Default
    private List<String> defaultCheckerIds = new ArrayList<>();

    @Valid
    @Builder.Default
    private List<CreateTaskTemplateRequest> taskTemplates = new ArrayList<>();
}

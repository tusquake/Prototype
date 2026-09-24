package com.cloudkaptan.sop.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body to manually create a single SOP + Task Template row")
public class CreateSingleSopTemplateRowRequest {

    @Schema(description = "Entity name or code (e.g. 'CK_INDIA', 'India', 'CK_AUSTRALIA', 'Australia'). Defaults to 'CK_INDIA' if not specified.", example = "CK_INDIA")
    private String entity;

    @Schema(description = "Process category name (e.g. 'GST', 'TDS', 'Payroll', 'Audit'). Defaults to 'GENERAL' if not specified.", example = "GST")
    private String processCategory;

    @NotBlank(message = "Title is required")
    @Schema(description = "SOP / Task Title", example = "108th Row - Monthly GST Reconciliation & Filing")
    private String title;

    @Schema(description = "Free-text due date expression (e.g. '30th of July, october, January and April', '15th of month', 'Every Quarter').", example = "20th of next month")
    private String dueDateText;

    @Schema(description = "Fallback or explicit frequency (e.g. 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'WEEKLY', 'DAILY').", example = "MONTHLY")
    private String frequency;

    @Schema(description = "Raw Maker alias text (e.g. 'Manoj and KPMG', 'Prayasa').", example = "Manoj and KPMG")
    private String maker;

    @Schema(description = "Raw Checker alias text (e.g. 'Prayasa', 'Calibre Partner').", example = "Prayasa")
    private String checker;

    @Schema(description = "Explicit list of Maker User IDs (overrides text resolution if provided).")
    private List<String> makerUserIds;

    @Schema(description = "Explicit list of Checker User IDs (overrides text resolution if provided).")
    private List<String> checkerUserIds;

    @Schema(description = "External consultant / reviewer text (appended to task description if provided).", example = "KPMG")
    private String consultantReview;

    @Schema(description = "Actor / Creator User ID (defaults to 'usr-manoj-042' if not specified).", example = "usr-manoj-042")
    private String actorId;

    @Schema(description = "Whether to overwrite existing template with same entity, category, and title.", example = "false")
    private Boolean overwriteExisting;

    @Schema(description = "Priority of task template ('High', 'Medium', 'Low'). Defaults to 'Medium'.", example = "Medium")
    private String priority;

    @Schema(description = "SLA hours for task template. Defaults to 72.", example = "72")
    private Integer slaHours;

    @Schema(description = "Effective from date. Defaults to current date if not specified.", example = "2026-09-24")
    private LocalDate effectiveFrom;
}

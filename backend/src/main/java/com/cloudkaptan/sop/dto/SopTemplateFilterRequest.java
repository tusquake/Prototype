package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for filtering and paginating SOP Templates")
public class SopTemplateFilterRequest {

    @Schema(description = "Filter by template status (e.g. 'ACTIVE', 'DRAFT', 'RETIRED')", example = "ACTIVE")
    private SopTemplateStatus status;

    @Schema(description = "Filter by entity codes (e.g. ['CK_INDIA', 'CK_AUSTRALIA'])")
    private List<EntityCode> entities;

    @Schema(description = "Filter by process category (e.g. 'GST', 'TDS', 'Payroll')", example = "GST")
    private String category;

    @Schema(description = "Filter by recurrence frequency ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'WEEKLY', 'DAILY')", example = "MONTHLY")
    private SopFrequency frequency;

    @Schema(description = "Search keyword in template title, template code, or description", example = "108th")
    private String search;

    @Schema(description = "Filter by creator User ID", example = "usr-manoj-042")
    private String createdBy;

    @Schema(description = "Filter by assigned Maker User ID")
    private String makerId;

    @Schema(description = "Filter by assigned Checker User ID")
    private String checkerId;

    @Builder.Default
    @Schema(description = "Page number (0-indexed)", example = "0")
    private int page = 0;

    @Builder.Default
    @Schema(description = "Page size", example = "20")
    private int size = 20;
}

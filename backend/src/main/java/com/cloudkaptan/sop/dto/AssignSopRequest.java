package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignSopRequest {

    @NotBlank(message = "SOP code is required")
    private String sopCode;

    @NotNull(message = "Entity code is required")
    private EntityCode entityCode;

    @NotBlank(message = "Process category is required and must be fixed by Admin")
    private String processCategory;

    // Legacy single creator — kept for backward compat; assignedCreatorIds takes precedence if provided
    private String assignedCreatorId;

    // Multi-creator support
    private List<String> assignedCreatorIds;

    // Legacy single approver — kept for backward compat; assignedApproverIds takes precedence if provided
    private String assignedApproverId;

    // Multi-approver support
    private List<String> assignedApproverIds;

    private String title;
}

package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
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
public class AssignSopRequest {

    @NotBlank(message = "SOP code is required")
    private String sopCode;

    @NotNull(message = "Entity code is required")
    private EntityCode entityCode;

    @NotBlank(message = "Process category is required and must be fixed by Admin")
    private String processCategory;

    @NotBlank(message = "Assigned Creator ID is required")
    private String assignedCreatorId;

    @NotBlank(message = "Assigned Approver ID is required")
    private String assignedApproverId;

    private String title;
}

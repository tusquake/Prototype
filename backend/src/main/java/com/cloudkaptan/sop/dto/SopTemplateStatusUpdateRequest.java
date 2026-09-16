package com.cloudkaptan.sop.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for updating SOP Template lifecycle status")
public class SopTemplateStatusUpdateRequest {

    @NotBlank(message = "Action is required (e.g. SUBMIT, ACTIVATE, REJECT, RETIRE)")
    @Schema(description = "Lifecycle action: SUBMIT, ACTIVATE, REJECT, or RETIRE", example = "SUBMIT")
    private String action;

    @Schema(description = "User ID performing the lifecycle action", example = "usr-manoj-042")
    private String actorId;

    @Schema(description = "Optional comment or review feedback", example = "SOP approved for deployment")
    private String comment;
}

package com.cloudkaptan.sop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionTaskDocumentRequest {
    @NotBlank(message = "action is required (APPROVE or REJECT)")
    private String action;

    private String comment;

    @NotBlank(message = "actorId is required")
    private String actorId;
}

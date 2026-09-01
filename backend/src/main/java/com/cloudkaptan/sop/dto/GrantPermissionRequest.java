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
public class GrantPermissionRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "processCategory is required")
    private String processCategory;

    @Builder.Default
    private Boolean canCreateSop = false;

    @Builder.Default
    private Boolean canApproveSop = false;

    @Builder.Default
    private Boolean canMakeTask = false;

    @Builder.Default
    private Boolean canCheckTask = false;
}

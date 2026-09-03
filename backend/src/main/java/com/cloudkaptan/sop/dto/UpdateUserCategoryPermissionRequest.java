package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserCategoryPermissionRequest {
    private Boolean canCreateSop;
    private Boolean canApproveSop;
    private Boolean canMakeTask;
    private Boolean canCheckTask;
}

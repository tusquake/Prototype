package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryPermissionDto {
    private UUID id;
    private String userId;
    private String processCategory;
    private Boolean canCreateSop;
    private Boolean canApproveSop;
    private Boolean canMakeTask;
    private Boolean canCheckTask;
}

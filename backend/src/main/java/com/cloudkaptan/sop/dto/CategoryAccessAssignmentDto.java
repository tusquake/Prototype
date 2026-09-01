package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAccessAssignmentDto {
    private String processCategory;
    private List<String> creatorUserIds;
    private List<String> approverUserIds;
    private List<String> makerUserIds;
    private List<String> checkerUserIds;
}

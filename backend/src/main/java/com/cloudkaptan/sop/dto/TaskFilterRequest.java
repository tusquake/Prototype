package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskFilterRequest {
    private List<EntityCode> entities;
    private TaskStatus status;
    private String category;
    private String search;
    private String userId;
    private String userRole;
    @Builder.Default
    private Boolean inboxOnly = false;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}

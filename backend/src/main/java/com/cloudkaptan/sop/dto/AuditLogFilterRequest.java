package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogFilterRequest {
    private String entityType;
    private String entityId;
    private String actorId;
    private String action;
    private String search;
    private String startDate;
    private String endDate;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}

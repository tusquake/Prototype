package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {

    private MetricsDto metrics;
    private List<ScorecardRowDto> scorecard;
    private List<TaskDto> overdueList;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsDto {
        private long trackedTasks;
        private long approvedThisCycle;
        private long pendingReview;
        private long overdue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScorecardRowDto {
        private EntityCode entityId;
        private String entity;
        private long totalTasks;
        private long overdue;
        private String onTimeRate;
    }
}

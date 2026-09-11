package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.DashboardSummaryDto;
import com.cloudkaptan.sop.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard Metrics", description = "Endpoints for executive dashboard metrics, entity compliance scorecards, and overdue task lists")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "Get dashboard executive summary", description = "Calculates aggregated compliance metrics (tracked tasks, approved count, pending review, overdue) and entity scorecards.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved dashboard summary metrics")
    })
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getSummary(
        @Parameter(description = "Optional filter by corporate entity codes") @RequestParam(name = "entities", required = false) List<EntityCode> entities,
        @Parameter(description = "Optional filter by current user ID") @RequestParam(name = "userId", required = false) String userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getDashboardSummary(entities, userId)));
    }
}


package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.DashboardSummaryDto;
import com.cloudkaptan.sop.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getSummary(
        @RequestParam(name = "entities", required = false) List<EntityCode> entities,
        @RequestParam(name = "userId", required = false) String userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getDashboardSummary(entities, userId)));
    }
}

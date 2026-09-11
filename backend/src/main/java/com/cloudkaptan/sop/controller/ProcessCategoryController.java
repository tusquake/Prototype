package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.ProcessCategoryDto;
import com.cloudkaptan.sop.entity.ProcessCategoryActivityLog;
import com.cloudkaptan.sop.service.ProcessCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/finsop/v1/process-categories")
@RequiredArgsConstructor
@Tag(name = "Process Categories", description = "Endpoints for managing process categories (e.g., Tax Compliance, Financial Reporting) and category activity audit logs")
public class ProcessCategoryController {

    private final ProcessCategoryService processCategoryService;

    @GetMapping
    @Operation(summary = "Get all process categories", description = "Retrieves all process categories master data.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved process categories")
    })
    public ResponseEntity<ApiResponse<List<ProcessCategoryDto>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.getAllCategories()));
    }

    @PostMapping
    @Operation(summary = "Create process category", description = "Creates a new process category master record.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Process category created successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload")
    })
    public ResponseEntity<ApiResponse<ProcessCategoryDto>> createCategory(
            @Valid @RequestBody ProcessCategoryDto dto) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.createCategory(dto)));
    }

    @PutMapping("/{identifier}")
    @Operation(summary = "Update process category", description = "Updates process category details flexible by code or ID.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Process category updated successfully")
    })
    public ResponseEntity<ApiResponse<ProcessCategoryDto>> updateCategory(
            @Parameter(description = "Category code or ID") @PathVariable("identifier") String identifier,
            @RequestBody ProcessCategoryDto dto) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.updateCategoryFlexible(identifier, dto)));
    }

    @DeleteMapping("/{identifier}")
    @Operation(summary = "Delete process category", description = "Deletes a process category record.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Process category deleted successfully")
    })
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteCategory(
            @Parameter(description = "Category code or ID") @PathVariable("identifier") String identifier) {
        processCategoryService.deleteCategory(identifier);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Process Category deleted successfully")));
    }

    @GetMapping("/{identifier}/activity-logs")
    @Operation(summary = "Get category activity logs", description = "Retrieves category activity log timeline.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Activity logs retrieved successfully")
    })
    public ResponseEntity<ApiResponse<List<ProcessCategoryActivityLog>>> getActivityLogs(
            @Parameter(description = "Category code or ID") @PathVariable("identifier") String identifier) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.getActivityLogs(identifier)));
    }
}


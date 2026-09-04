package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.ProcessCategoryDto;
import com.cloudkaptan.sop.entity.ProcessCategoryActivityLog;
import com.cloudkaptan.sop.service.ProcessCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/finsop/v1/process-categories")
@RequiredArgsConstructor
public class ProcessCategoryController {

    private final ProcessCategoryService processCategoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProcessCategoryDto>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.getAllCategories()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProcessCategoryDto>> createCategory(@Valid @RequestBody ProcessCategoryDto dto) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.createCategory(dto)));
    }

    @PutMapping("/{identifier}")
    public ResponseEntity<ApiResponse<ProcessCategoryDto>> updateCategory(
            @PathVariable("identifier") String identifier,
            @RequestBody ProcessCategoryDto dto) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.updateCategoryFlexible(identifier, dto)));
    }

    @DeleteMapping("/{identifier}")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteCategory(@PathVariable("identifier") String identifier) {
        processCategoryService.deleteCategory(identifier);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Process Category deleted successfully")));
    }

    @GetMapping("/{identifier}/activity-logs")
    public ResponseEntity<ApiResponse<List<ProcessCategoryActivityLog>>> getActivityLogs(@PathVariable("identifier") String identifier) {
        return ResponseEntity.ok(ApiResponse.success(processCategoryService.getActivityLogs(identifier)));
    }
}

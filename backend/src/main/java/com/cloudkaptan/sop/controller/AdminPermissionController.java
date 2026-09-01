package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.service.UserCategoryPermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = {"/finsop/v1/admin/permissions", "/api/v1/admin/permissions"})
@RequiredArgsConstructor
public class AdminPermissionController {

    private final UserCategoryPermissionService categoryPermissionService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CategoryPermissionDto>>> getUserPermissions(@PathVariable("userId") String userId) {
        List<CategoryPermissionDto> perms = categoryPermissionService.getUserPermissions(userId);
        return ResponseEntity.ok(ApiResponse.success(perms));
    }

    @PostMapping("/grant")
    public ResponseEntity<ApiResponse<CategoryPermissionDto>> grantPermission(@Valid @RequestBody GrantPermissionRequest request) {
        CategoryPermissionDto granted = categoryPermissionService.grantPermission(request);
        return ResponseEntity.ok(ApiResponse.success(granted));
    }

    @GetMapping("/category/{categoryCode}")
    public ResponseEntity<ApiResponse<com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto>> getCategoryAssignments(@PathVariable("categoryCode") String categoryCode) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.getCategoryAssignments(categoryCode)));
    }

    @PostMapping("/category/assign")
    public ResponseEntity<ApiResponse<com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto>> saveCategoryAssignments(@RequestBody com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto dto) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.saveCategoryAssignments(dto)));
    }

    @GetMapping("/user/{userId}/accessible-categories")
    public ResponseEntity<ApiResponse<List<String>>> getUserAccessibleCategories(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.getUserAccessibleCategories(userId)));
    }
}

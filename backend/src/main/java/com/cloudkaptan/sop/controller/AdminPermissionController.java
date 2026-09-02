package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto;
import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.entity.AccessControlActivityLog;
import com.cloudkaptan.sop.service.UserCategoryPermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<ApiResponse<CategoryAccessAssignmentDto>> getCategoryAssignments(@PathVariable("categoryCode") String categoryCode) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.getCategoryAssignments(categoryCode)));
    }

    @PostMapping("/category/assign")
    public ResponseEntity<ApiResponse<CategoryAccessAssignmentDto>> saveCategoryAssignments(
            @RequestBody CategoryAccessAssignmentDto dto,
            @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.saveCategoryAssignments(dto, actorHeaderId)));
    }

    @GetMapping("/user/{userId}/accessible-categories")
    public ResponseEntity<ApiResponse<List<String>>> getUserAccessibleCategories(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.getUserAccessibleCategories(userId)));
    }

    @GetMapping("/category/{categoryCode}/users")
    public ResponseEntity<ApiResponse<List<String>>> getUsersByPermission(
            @PathVariable("categoryCode") String categoryCode,
            @RequestParam(value = "permission", defaultValue = "CREATOR") String permission) {
        List<String> userIds = categoryPermissionService.getUsersByPermission(categoryCode, permission);
        return ResponseEntity.ok(ApiResponse.success(userIds));
    }

    @GetMapping("/activity-logs")
    public ResponseEntity<ApiResponse<List<AccessControlActivityLog>>> getAccessControlActivityLogs(
            @RequestParam(value = "processCategory", required = false) String processCategory) {
        return ResponseEntity.ok(ApiResponse.success(categoryPermissionService.getAccessControlActivityLogs(processCategory)));
    }
}

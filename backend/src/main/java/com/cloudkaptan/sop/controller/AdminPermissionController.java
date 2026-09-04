package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto;
import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateCategoryAccessTypeRequest;
import com.cloudkaptan.sop.dto.UpdateUserCategoryPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateSinglePermissionRequest;
import com.cloudkaptan.sop.entity.AccessControlActivityLog;
import com.cloudkaptan.sop.service.UserCategoryPermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping(value = {"/finsop/v1/admin/permissions", "/api/v1/admin/permissions"})
@RequiredArgsConstructor
@Tag(name = "Access Control & Permissions", description = "Endpoints for process category permissions, role assignments (Creators, Approvers, Makers, Checkers), and access activity logs")
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

    @PutMapping("/category/{categoryCode}/access-type/{accessType}")
    public ResponseEntity<ApiResponse<CategoryAccessAssignmentDto>> updateCategoryAccessType(
            @PathVariable("categoryCode") String categoryCode,
            @PathVariable("accessType") String accessType,
            @RequestBody UpdateCategoryAccessTypeRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryAccessAssignmentDto result = categoryPermissionService.updateCategoryAccessType(
                categoryCode, accessType, request.getUserIds(), actorHeaderId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/user/{userId}/category/{categoryCode}")
    public ResponseEntity<ApiResponse<CategoryPermissionDto>> updateUserPermission(
            @PathVariable("userId") String userId,
            @PathVariable("categoryCode") String categoryCode,
            @RequestBody UpdateUserCategoryPermissionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryPermissionDto result = categoryPermissionService.updateUserCategoryPermission(
                userId, categoryCode, request, actorHeaderId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/user/{userId}/category/{categoryCode}/access-type/{accessType}")
    public ResponseEntity<ApiResponse<CategoryPermissionDto>> updateSinglePermission(
            @PathVariable("userId") String userId,
            @PathVariable("categoryCode") String categoryCode,
            @PathVariable("accessType") String accessType,
            @RequestBody UpdateSinglePermissionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryPermissionDto result = categoryPermissionService.updateSinglePermission(
                userId, categoryCode, accessType, request.getEnabled(), actorHeaderId);
        return ResponseEntity.ok(ApiResponse.success(result));
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

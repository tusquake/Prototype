package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto;
import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateCategoryAccessTypeRequest;
import com.cloudkaptan.sop.dto.UpdateUserCategoryPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateSinglePermissionRequest;
import com.cloudkaptan.sop.entity.AccessControlActivityLog;
import com.cloudkaptan.sop.service.UserCategoryPermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/admin/permissions")
@RequiredArgsConstructor
@Tag(name = "Access Control & Permissions", description = "Endpoints for process category permissions, role assignments (Creators, Approvers, Makers, Checkers), and access activity logs")
public class AdminPermissionController {

    private final UserCategoryPermissionService categoryPermissionService;

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user category permissions", description = "Retrieves all process category permissions granted to a specific user.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved user permissions"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<CategoryPermissionDto>>> getUserPermissions(
            @Parameter(description = "User ID (e.g. usr-manoj-042)") @PathVariable("userId") String userId) {
        List<CategoryPermissionDto> perms = categoryPermissionService.getUserPermissions(userId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(perms));
    }

    @PostMapping("/grant")
    @Operation(summary = "Grant user category permission", description = "Grants or updates category-level permissions (Creator, Approver, Maker, Checker) for a user.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Permission granted successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryPermissionDto>> grantPermission(
            @Valid @RequestBody GrantPermissionRequest request) {
        CategoryPermissionDto granted = categoryPermissionService.grantPermission(request);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(granted));
    }

    @GetMapping("/category/{categoryCode}")
    @Operation(summary = "Get category access assignments", description = "Retrieves current user assignments (Creators, Approvers, Makers, Checkers) for a process category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved category assignments")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryAccessAssignmentDto>> getCategoryAssignments(
            @Parameter(description = "Process category code") @PathVariable("categoryCode") String categoryCode) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(categoryPermissionService.getCategoryAssignments(categoryCode)));
    }

    @PostMapping("/category/assign")
    @Operation(summary = "Save category access assignments", description = "Bulk assigns users to Creator, Approver, Maker, or Checker roles for a process category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category assignments saved successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryAccessAssignmentDto>> saveCategoryAssignments(
            @RequestBody CategoryAccessAssignmentDto dto,
            @Parameter(description = "Actor User ID header") @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(categoryPermissionService.saveCategoryAssignments(dto, actorHeaderId)));
    }

    @PutMapping("/category/{categoryCode}/access-type/{accessType}")
    @Operation(summary = "Update category access type users", description = "Updates assigned user list for a specific access type (CREATOR | APPROVER | MAKER | CHECKER) under a category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Access type assignments updated successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryAccessAssignmentDto>> updateCategoryAccessType(
            @Parameter(description = "Process category code") @PathVariable("categoryCode") String categoryCode,
            @Parameter(description = "Access type (CREATOR | APPROVER | MAKER | CHECKER)") @PathVariable("accessType") String accessType,
            @RequestBody UpdateCategoryAccessTypeRequest request,
            @Parameter(description = "Actor User ID header") @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryAccessAssignmentDto result = categoryPermissionService.updateCategoryAccessType(
                categoryCode, accessType, request.getUserIds(), actorHeaderId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(result));
    }

    @PutMapping("/user/{userId}/category/{categoryCode}")
    @Operation(summary = "Update user category permissions", description = "Updates full permission flags (isCreator, isApprover, isMaker, isChecker) for a user under a specific category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User permissions updated successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryPermissionDto>> updateUserPermission(
            @Parameter(description = "User ID") @PathVariable("userId") String userId,
            @Parameter(description = "Process category code") @PathVariable("categoryCode") String categoryCode,
            @RequestBody UpdateUserCategoryPermissionRequest request,
            @Parameter(description = "Actor User ID header") @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryPermissionDto result = categoryPermissionService.updateUserCategoryPermission(
                userId, categoryCode, request, actorHeaderId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(result));
    }

    @PutMapping("/user/{userId}/category/{categoryCode}/access-type/{accessType}")
    @Operation(summary = "Toggle single permission for user", description = "Enables or disables a specific permission flag (CREATOR, APPROVER, MAKER, CHECKER) for a user.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Single permission updated successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<CategoryPermissionDto>> updateSinglePermission(
            @Parameter(description = "User ID") @PathVariable("userId") String userId,
            @Parameter(description = "Process category code") @PathVariable("categoryCode") String categoryCode,
            @Parameter(description = "Access type (CREATOR | APPROVER | MAKER | CHECKER)") @PathVariable("accessType") String accessType,
            @RequestBody UpdateSinglePermissionRequest request,
            @Parameter(description = "Actor User ID header") @RequestHeader(value = "X-User-Id", required = false) String actorHeaderId) {
        CategoryPermissionDto result = categoryPermissionService.updateSinglePermission(
                userId, categoryCode, accessType, request.getEnabled(), actorHeaderId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(result));
    }

    @GetMapping("/user/{userId}/accessible-categories")
    @Operation(summary = "Get accessible categories for user", description = "Lists process category codes that the user has permission to access.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved accessible categories")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<String>>> getUserAccessibleCategories(
            @Parameter(description = "User ID") @PathVariable("userId") String userId) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(categoryPermissionService.getUserAccessibleCategories(userId)));
    }

    @GetMapping("/user/{userId}/creatable-categories")
    @Operation(summary = "Get categories where user can create SOPs", description = "Lists process category codes/names that the user has CAN_CREATE_SOP permission to create.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved creatable categories")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<String>>> getUserCreatableCategories(
            @Parameter(description = "User ID") @PathVariable("userId") String userId) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(categoryPermissionService.getUserCreatableCategories(userId)));
    }

    @GetMapping("/category/{categoryCode}/users")
    @Operation(summary = "Get users by category permission", description = "Returns user IDs having a specific permission type (CREATOR | APPROVER | MAKER | CHECKER) for a category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved user list")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<String>>> getUsersByPermission(
            @Parameter(description = "Process category code") @PathVariable("categoryCode") String categoryCode,
            @Parameter(description = "Permission type (CREATOR | APPROVER | MAKER | CHECKER)") @RequestParam(value = "permission", defaultValue = "CREATOR") String permission) {
        List<String> userIds = categoryPermissionService.getUsersByPermission(categoryCode, permission);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(userIds));
    }

    @GetMapping("/activity-logs")
    @Operation(summary = "Get access control activity logs", description = "Retrieves permission change audit logs filtered optionally by process category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved access control activity logs")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<AccessControlActivityLog>>> getAccessControlActivityLogs(
            @Parameter(description = "Optional process category filter") @RequestParam(value = "processCategory", required = false) String processCategory) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(categoryPermissionService.getAccessControlActivityLogs(processCategory)));
    }
}



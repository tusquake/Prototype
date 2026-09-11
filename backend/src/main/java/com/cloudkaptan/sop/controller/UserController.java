package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.UserDto;
import com.cloudkaptan.sop.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/access")
@RequiredArgsConstructor
@Tag(name = "User Management & Access", description = "User profile lookups, active session context, and system user directory")
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    @Operation(summary = "Get user directory", description = "Retrieves system users optionally filtered by application role (ADMIN, MAKER, CHECKER, VIEWER).")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved user list")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<UserDto>>> getUsers(
        @Parameter(description = "Role filter (ADMIN | MAKER | CHECKER | VIEWER)") @RequestParam(name = "role", required = false) String role
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(userService.getUsers(role)));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user session context", description = "Retrieves user profile, assigned roles, and OIDC group memberships for the active session.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved current user context"),
        @ApiResponse(responseCode = "404", description = "User email not found")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<UserDto>> getCurrentUser(
        @Parameter(description = "User email address") @RequestParam(name = "email", defaultValue = "mainak.gupta@cloudkaptan.com") String email
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(userService.getUserByEmail(email)));
    }
}


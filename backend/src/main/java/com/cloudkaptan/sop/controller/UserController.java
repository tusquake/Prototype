package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/finsop/v1/access")
@RequiredArgsConstructor
@Tag(name = "User Management & Access", description = "User profile lookups, active session context, and system user directory")
public class UserController {

    private final UserService userService;

    @PostMapping("/users/search")
    @Operation(summary = "Search user directory", description = "Returns paginated users filtered by role, entityCode, and search term.")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> searchUsers(
            @RequestBody(required = false) UserFilterRequest request
    ) {
        if (request == null) request = new UserFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        Page<UserDto> page = userService.getUsers(request, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    @GetMapping("/users")
    @Operation(summary = "Get user directory (legacy)", description = "Retrieves users filtered by role. Use POST /users/search for pagination.")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @Parameter(description = "Role filter") @RequestParam(name = "role", required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        UserFilterRequest request = UserFilterRequest.builder()
                .page(page).size(size).build();
        if (role != null) request.setRoleName(role);
        Page<UserDto> result = userService.getUsers(request, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user session context", description = "Retrieves user profile, assigned roles, and OIDC group memberships for the active session.")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
        @Parameter(description = "User email address") @RequestParam(name = "email", defaultValue = "mainak.gupta@cloudkaptan.com") String email
    ) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserByEmail(email)));
    }
}

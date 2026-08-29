package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.UserDto;
import com.cloudkaptan.sop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/access")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsers(
        @RequestParam(name = "role", required = false) String role
    ) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsers(role)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
        @RequestParam(name = "email", defaultValue = "mainak.gupta@cloudkaptan.com") String email
    ) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserByEmail(email)));
    }
}

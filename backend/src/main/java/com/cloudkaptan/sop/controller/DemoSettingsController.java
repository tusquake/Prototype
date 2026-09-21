package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.DemoSettingsDto;
import com.cloudkaptan.sop.service.DemoRuntimeSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/finsop/v1/admin/demo-settings")
@RequiredArgsConstructor
@Tag(name = "Demo & Runtime Feature Flags", description = "Endpoints to dynamic toggle demo mode behaviors (auto-instantiate on approval, bypass due date checks) at runtime without container redeployment.")
public class DemoSettingsController {

    private final DemoRuntimeSettingsService demoRuntimeSettingsService;

    @GetMapping
    @Operation(summary = "Get current demo runtime settings", description = "Returns active dynamic feature flags.")
    public ResponseEntity<ApiResponse<DemoSettingsDto>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(demoRuntimeSettingsService.getCurrentSettings()));
    }

    @PostMapping
    @Operation(summary = "Update demo runtime settings", description = "Dynamically updates runtime flags without restarting backend.")
    public ResponseEntity<ApiResponse<DemoSettingsDto>> updateSettings(@RequestBody DemoSettingsDto request) {
        DemoSettingsDto updated = demoRuntimeSettingsService.updateSettings(request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Demo runtime settings updated successfully."));
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset demo runtime settings", description = "Resets all dynamic flags to default production values.")
    public ResponseEntity<ApiResponse<DemoSettingsDto>> resetSettings() {
        demoRuntimeSettingsService.resetSettings();
        return ResponseEntity.ok(ApiResponse.success(demoRuntimeSettingsService.getCurrentSettings(), "Demo settings reset to default."));
    }
}

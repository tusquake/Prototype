package com.cloudkaptan.sop.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/finsop/v1/health")
@Tag(name = "System Health", description = "Service health check and status probe endpoints")
public class HealthController {

    @GetMapping
    @Operation(summary = "Get service health status", description = "Liveness probe returning application status, service name, and server timestamp.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Service is UP and healthy")
    })
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "finsop-backend",
            "timestamp", OffsetDateTime.now().toString()
        ));
    }
}


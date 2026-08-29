package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/finsop/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> details = Map.of(
            "status", "UP",
            "service", "FinSOP Spring Boot 3.3 Backend Engine",
            "timestamp", OffsetDateTime.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success(details, "Service is healthy"));
    }
}

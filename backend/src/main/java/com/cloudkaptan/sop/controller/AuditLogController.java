package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.AuditLogDto;
import com.cloudkaptan.sop.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable audit log trail for compliance tracking and governance history")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Get system audit logs", description = "Retrieves immutable audit logs for compliance tracking. Restricted to System Administrators.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved audit logs"),
        @ApiResponse(responseCode = "403", description = "Access denied — Requires Admin privileges")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Page<AuditLogDto>>> getAuditLogs(
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(auditLogService.getAllAuditLogs(pageable)));
    }
}



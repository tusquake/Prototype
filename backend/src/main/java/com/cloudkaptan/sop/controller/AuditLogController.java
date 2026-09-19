package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.AuditLogDto;
import com.cloudkaptan.sop.dto.AuditLogFilterRequest;
import com.cloudkaptan.sop.dto.PageResponse;
import com.cloudkaptan.sop.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/finsop/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable audit log trail for compliance tracking and governance history")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @PostMapping("/search")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Search audit logs", description = "Returns paginated audit logs filtered by entityType, entityId, actorId, action, search term, and date range.")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogDto>>> searchAuditLogs(
            @RequestBody(required = false) AuditLogFilterRequest request
    ) {
        if (request == null) request = new AuditLogFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        Page<AuditLogDto> page = auditLogService.getFilteredAuditLogs(request, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }
}

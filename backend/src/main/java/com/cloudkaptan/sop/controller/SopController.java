package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.service.SopService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/sops")
@RequiredArgsConstructor
@Tag(name = "SOP Governance", description = "Endpoints for Standard Operating Procedures (SOPs) lifecycle, creation, editing, assignment pools, and approval workflows")
public class SopController {

    private final SopService sopService;

    @PostMapping("/search")
    @Operation(summary = "Search / list SOPs", description = "Returns paginated SOPs filtered by entities, status, category, frequency, search term, userId, and userRole. Frontend sends page (0-based) and size.")
    public ResponseEntity<ApiResponse<PageResponse<SopDto>>> searchSops(
            @RequestBody(required = false) SopFilterRequest request
    ) {
        if (request == null) request = new SopFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        Page<SopDto> page = sopService.getSopsForUser(
                request.getEntities(),
                request.getStatus(),
                request.getCategory(),
                request.getFrequency(),
                request.getSearch(),
                request.getUserId(),
                request.getUserRole(),
                pageable
        );
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get SOP by ID", description = "Retrieves full details of an SOP including version number, history timeline, assigned creators, approvers, makers, and checkers.")
    public ResponseEntity<ApiResponse<SopDto>> getSopById(
        @Parameter(description = "SOP UUID") @PathVariable("id") UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(sopService.getSopById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Create SOP specification", description = "Creates a new SOP master record with designated creator, approver, default makers, and checkers.")
    public ResponseEntity<ApiResponse<SopDto>> createSop(
        @Valid @RequestBody CreateSopRequest request
    ) {
        SopDto created = sopService.createSop(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(created, "SOP created successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update SOP specification", description = "Updates an existing SOP procedure and resubmits it for approval.")
    public ResponseEntity<ApiResponse<SopDto>> updateSop(
        @Parameter(description = "SOP UUID") @PathVariable("id") UUID id,
        @Valid @RequestBody CreateSopRequest request
    ) {
        SopDto updated = sopService.updateSop(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "SOP updated successfully"));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Assign SOP to Creator & Approver", description = "Assigns an SOP code to a designated Creator and Approver to initiate governance drafting.")
    public ResponseEntity<ApiResponse<SopDto>> assignSop(
        @Valid @RequestBody AssignSopRequest request
    ) {
        SopDto assigned = sopService.assignSop(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(assigned, "SOP assignment created successfully. Creator notified to draft specification."));
    }

    @PutMapping("/{id}/submit")
    @Operation(summary = "Submit SOP draft for approval", description = "Creator submits completed SOP draft for assigned Approver review.")
    public ResponseEntity<ApiResponse<SopDto>> submitSop(
        @Parameter(description = "SOP UUID") @PathVariable("id") UUID id,
        @Valid @RequestBody SubmitSopRequest request
    ) {
        SopDto submitted = sopService.submitSop(id, request);
        return ResponseEntity.ok(ApiResponse.success(submitted, "SOP draft submitted for approval successfully."));
    }

    @PutMapping("/{id}/action")
    @Operation(summary = "Approve or reject SOP draft", description = "Approver approves SOP draft (activating it for task scheduling) or rejects it back to Creator with feedback.")
    public ResponseEntity<ApiResponse<SopDto>> actionSop(
        @Parameter(description = "SOP UUID") @PathVariable("id") UUID id,
        @Valid @RequestBody SopActionRequest request
    ) {
        SopDto updated = sopService.actionSop(id, request);
        String msg = "APPROVE".equalsIgnoreCase(request.getAction())
            ? "SOP approved successfully. SOP is now ACTIVE for automated task scheduling."
            : "SOP rejected back to creator with revision feedback.";
        return ResponseEntity.ok(ApiResponse.success(updated, msg));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Delete SOP", description = "Deletes an SOP record. Restricted to Admin users.")
    public ResponseEntity<ApiResponse<Void>> deleteSop(
        @Parameter(description = "SOP UUID") @PathVariable("id") UUID id
    ) {
        sopService.deleteSop(id);
        return ResponseEntity.ok(ApiResponse.success(null, "SOP deleted successfully"));
    }

    @PostMapping("/create-complete")
    public ResponseEntity<ApiResponse<SopDto>> createSopPendingApproval(
            @Valid @RequestBody CreateSopRequest request
    ) {
        SopDto created = sopService.createSopPendingApproval(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "SOP created successfully and submitted for approval."));
    }
}

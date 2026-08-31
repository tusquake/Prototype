package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CreateSopRequest;
import com.cloudkaptan.sop.dto.SopDto;
import com.cloudkaptan.sop.service.SopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/sops")
@RequiredArgsConstructor
public class SopController {

    private final SopService sopService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SopDto>>> getSops(
        @RequestParam(name = "entities", required = false) List<EntityCode> entities
    ) {
        return ResponseEntity.ok(ApiResponse.success(sopService.getSops(entities)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SopDto>> getSopById(
        @PathVariable("id") java.util.UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(sopService.getSopById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<SopDto>> createSop(
        @Valid @RequestBody CreateSopRequest request
    ) {
        SopDto created = sopService.createSop(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(created, "SOP created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<SopDto>> updateSop(
        @PathVariable("id") java.util.UUID id,
        @Valid @RequestBody CreateSopRequest request
    ) {
        SopDto updated = sopService.updateSop(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "SOP updated successfully"));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<SopDto>> assignSop(
        @Valid @RequestBody com.cloudkaptan.sop.dto.AssignSopRequest request
    ) {
        SopDto assigned = sopService.assignSop(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(assigned, "SOP assignment created successfully. Creator notified to draft specification."));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<SopDto>> submitSop(
        @PathVariable("id") java.util.UUID id,
        @Valid @RequestBody com.cloudkaptan.sop.dto.SubmitSopRequest request
    ) {
        SopDto submitted = sopService.submitSop(id, request);
        return ResponseEntity.ok(ApiResponse.success(submitted, "SOP draft submitted for approval successfully."));
    }

    @PutMapping("/{id}/action")
    public ResponseEntity<ApiResponse<SopDto>> actionSop(
        @PathVariable("id") java.util.UUID id,
        @Valid @RequestBody com.cloudkaptan.sop.dto.SopActionRequest request
    ) {
        SopDto updated = sopService.actionSop(id, request);
        String msg = "APPROVE".equalsIgnoreCase(request.getAction())
            ? "SOP approved successfully. SOP is now ACTIVE for automated task scheduling."
            : "SOP rejected back to creator with revision feedback.";
        return ResponseEntity.ok(ApiResponse.success(updated, msg));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteSop(
        @PathVariable("id") java.util.UUID id
    ) {
        sopService.deleteSop(id);
        return ResponseEntity.ok(ApiResponse.success(null, "SOP deleted successfully"));
    }
}

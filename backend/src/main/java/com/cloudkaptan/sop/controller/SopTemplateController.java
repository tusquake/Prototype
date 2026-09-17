package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CreateSopTemplateRequest;
import com.cloudkaptan.sop.dto.CreateTaskTemplateRequest;
import com.cloudkaptan.sop.dto.SopTemplateDto;
import com.cloudkaptan.sop.dto.SopTemplateStatusUpdateRequest;
import com.cloudkaptan.sop.service.SopTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/sop-templates")
@RequiredArgsConstructor
@Tag(name = "SOP Templates", description = "Blueprint management endpoints for SOP Template + Task Template authoring (3-step wizard)")
public class SopTemplateController {

    private final SopTemplateService sopTemplateService;

    @PostMapping
    @Operation(summary = "Create SOP Template (Step 1 draft save)",
               description = "Creates a new SOP Template blueprint in DRAFT status. Optionally include task templates for a single-shot creation.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> createTemplate(
            @Valid @RequestBody CreateSopTemplateRequest request
    ) {
        SopTemplateDto created = sopTemplateService.createTemplate(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "SOP Template draft created successfully."));
    }

    @GetMapping
    @Operation(summary = "List SOP Templates",
               description = "Returns all SOP Templates, optionally filtered by status.")
    public ResponseEntity<ApiResponse<List<SopTemplateDto>>> listTemplates(
            @RequestParam(name = "status", required = false) SopTemplateStatus status
    ) {
        List<SopTemplateDto> templates = (status != null)
                ? sopTemplateService.getByStatus(status)
                : sopTemplateService.getAllTemplates();
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @GetMapping("/{templateId}")
    @Operation(summary = "Get SOP Template by ID")
    public ResponseEntity<ApiResponse<SopTemplateDto>> getTemplate(
            @PathVariable UUID templateId
    ) {
        return ResponseEntity.ok(ApiResponse.success(sopTemplateService.getById(templateId)));
    }

    @PutMapping("/{templateId}")
    @Operation(summary = "Update SOP Template meta (Step 1 edit)",
               description = "Updates blueprint metadata. Only allowed when status is DRAFT.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateSopTemplateRequest request
    ) {
        SopTemplateDto updated = sopTemplateService.updateTemplate(templateId, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "SOP Template updated."));
    }

    @PostMapping({"/{templateId}/task-templates", "/{templateId}/tasks"})
    @Operation(summary = "Add task step to SOP Template (Step 2 draft save)",
               description = "Appends a new task template step to an existing SOP Template. Step sequence is auto-assigned.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> addTaskTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateTaskTemplateRequest request
    ) {
        SopTemplateDto updated = sopTemplateService.addTaskTemplate(templateId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(updated, "Task step added to SOP Template."));
    }

    @PutMapping({"/{templateId}/task-templates/{taskTemplateId}", "/{templateId}/tasks/{taskTemplateId}"})
    @Operation(summary = "Update a task step blueprint")
    public ResponseEntity<ApiResponse<SopTemplateDto>> updateTaskTemplate(
            @PathVariable UUID templateId,
            @PathVariable UUID taskTemplateId,
            @Valid @RequestBody CreateTaskTemplateRequest request
    ) {
        SopTemplateDto updated = sopTemplateService.updateTaskTemplate(templateId, taskTemplateId, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Task template step updated."));
    }

    @DeleteMapping({"/{templateId}/task-templates/{taskTemplateId}", "/{templateId}/tasks/{taskTemplateId}"})
    @Operation(summary = "Remove a task step blueprint")
    public ResponseEntity<ApiResponse<SopTemplateDto>> deleteTaskTemplate(
            @PathVariable UUID templateId,
            @PathVariable UUID taskTemplateId
    ) {
        SopTemplateDto updated = sopTemplateService.deleteTaskTemplate(templateId, taskTemplateId);
        return ResponseEntity.ok(ApiResponse.success(updated, "Task template step removed and remaining steps re-sequenced."));
    }

    @PutMapping("/{templateId}/status")
    @Operation(summary = "Update SOP Template status",
               description = "Unified lifecycle status transition endpoint using JSON request payload. Actions: SUBMIT, ACTIVATE, REJECT, RETIRE.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> updateTemplateStatus(
            @PathVariable UUID templateId,
            @Valid @RequestBody SopTemplateStatusUpdateRequest request
    ) {
        SopTemplateDto updated = sopTemplateService.transitionStatus(
                templateId,
                request.getAction(),
                request.getActorId(),
                request.getComment()
        );
        return ResponseEntity.ok(ApiResponse.success(updated, "SOP Template status successfully updated to " + updated.getStatus() + "."));
    }
    @PostMapping("/{templateId}/instantiate")
    @Operation(summary = "Instantiate SOP from Template (On-Demand Demo Trigger)",
               description = "Manually triggers generation of an active SOP Instance and Task instances from an active SOP Template.")
    public ResponseEntity<ApiResponse<String>> instantiateTemplate(
            @PathVariable UUID templateId
    ) {
        sopTemplateService.instantiateTemplate(templateId);
        return ResponseEntity.ok(ApiResponse.success("SOP Instance and Task instances generated successfully from template.", "Instantiated successfully"));
    }
}


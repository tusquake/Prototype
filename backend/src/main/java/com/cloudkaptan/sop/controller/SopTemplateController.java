package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CreateSopTemplateRequest;
import com.cloudkaptan.sop.dto.CreateTaskTemplateRequest;
import com.cloudkaptan.sop.dto.SopTemplateDto;
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

    // ─── Template CRUD ────────────────────────────────────────────────────────

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

    // ─── Task Template Steps (Step 2 incremental saves) ───────────────────────

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

    // ─── Lifecycle Transitions ────────────────────────────────────────────────

    @PutMapping("/{templateId}/submit")
    @Operation(summary = "Submit SOP Template for approval (Step 3 final save)",
               description = "Promotes a DRAFT template to PENDING_APPROVAL and notifies assigned approvers.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> submitForApproval(
            @PathVariable UUID templateId,
            @RequestParam(name = "actorId", required = false) String actorId
    ) {
        SopTemplateDto submitted = sopTemplateService.submitForApproval(templateId, actorId);
        return ResponseEntity.ok(ApiResponse.success(submitted, "SOP Template submitted for approval successfully. Status: PENDING_APPROVAL."));
    }

    @PutMapping("/{templateId}/activate")
    @Operation(summary = "Activate SOP Template",
               description = "Promotes a PENDING_APPROVAL or DRAFT template to ACTIVE. The scheduler will begin generating SOP instances from effectiveFrom date.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> activateTemplate(
            @PathVariable UUID templateId
    ) {
        SopTemplateDto activated = sopTemplateService.activateTemplate(templateId);
        return ResponseEntity.ok(ApiResponse.success(activated,
                "SOP Template is now ACTIVE. The scheduler will generate SOP instances from " + activated.getEffectiveFrom() + "."));
    }

    @PutMapping("/{templateId}/reject")
    @Operation(summary = "Reject SOP Template",
               description = "Sets the template status to REJECTED with revision feedback.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> rejectTemplate(
            @PathVariable UUID templateId,
            @RequestParam(name = "comment", required = false) String comment
    ) {
        SopTemplateDto rejected = sopTemplateService.rejectTemplate(templateId, comment);
        return ResponseEntity.ok(ApiResponse.success(rejected, "SOP Template rejected back to creator."));
    }

    @PutMapping("/{templateId}/retire")
    @Operation(summary = "Retire SOP Template",
               description = "Sets the template status to RETIRED. No new SOP instances will be generated.")
    public ResponseEntity<ApiResponse<SopTemplateDto>> retireTemplate(
            @PathVariable UUID templateId
    ) {
        SopTemplateDto retired = sopTemplateService.retireTemplate(templateId);
        return ResponseEntity.ok(ApiResponse.success(retired, "SOP Template retired. No further SOP instances will be generated."));
    }
}


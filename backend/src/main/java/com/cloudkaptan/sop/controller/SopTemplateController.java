package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.service.SopTemplateService;
import com.cloudkaptan.sop.service.TaskSchedulerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/sop-templates")
@RequiredArgsConstructor
@Tag(name = "SOP Templates", description = "Blueprint management endpoints for SOP Template + Task Template authoring (3-step wizard)")
public class SopTemplateController {

    private final SopTemplateService sopTemplateService;
    private final TaskSchedulerService taskSchedulerService;

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

    @PostMapping("/search")
    @Operation(summary = "Search / list SOP Templates",
               description = "Returns paginated SOP Templates filtered by status, entities, category, frequency, and search term. Frontend sends page number (1-based) and size.")
    public ResponseEntity<ApiResponse<PageResponse<SopTemplateDto>>> searchTemplates(
            @RequestBody(required = false) SopTemplateFilterRequest request
    ) {
        if (request == null) request = new SopTemplateFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        Page<SopTemplateDto> page = sopTemplateService.getFilteredTemplates(
                request.getStatus(),
                request.getEntities(),
                request.getCategory(),
                request.getFrequency(),
                request.getSearch(),
                pageable
        );
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    @GetMapping("/{templateId}")
    @Operation(summary = "Get SOP Template by ID")
    public ResponseEntity<ApiResponse<SopTemplateDto>> getTemplate(
            @PathVariable UUID templateId
    ) {
        return ResponseEntity.ok(ApiResponse.success(sopTemplateService.getById(templateId)));
    }

    @GetMapping("/{templateId}/audit-logs")
    @Operation(summary = "Get SOP Template audit trail history",
               description = "Retrieves paginated audit log timeline for a specific SOP Template blueprint.")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogDto>>> getTemplateAuditLogs(
            @PathVariable UUID templateId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLogDto> result = sopTemplateService.getTemplateAuditLogs(templateId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
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
               description = "Unified lifecycle status transition endpoint. Actions: SUBMIT, ACTIVATE, REJECT, RETIRE.")
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

    @DeleteMapping("/{templateId}")
    @Operation(summary = "Delete SOP Template",
               description = "Deletes an SOP Template blueprint and all associated task step templates.")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(
            @PathVariable UUID templateId
    ) {
        sopTemplateService.deleteTemplate(templateId);
        return ResponseEntity.ok(ApiResponse.success(null, "SOP Template and all associated task step templates deleted successfully."));
    }

    @PostMapping("/instantiate-scheduled")
    @Operation(summary = "Directly Instantiate Scheduled SOPs for Date",
               description = "Directly creates SOP instances and tasks in DB for templates scheduled on a specific date (defaults to today). Bypasses GCP Cloud Tasks & Scheduler for live demos.")
    public ResponseEntity<ApiResponse<List<String>>> instantiateScheduledTemplates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, defaultValue = "false") boolean bypassRecurrenceCheck
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<Sop> createdSops = taskSchedulerService.triggerDirectSopInstantiation(targetDate, bypassRecurrenceCheck);
        List<String> createdSopCodes = createdSops.stream().map(Sop::getSopCode).toList();

        return ResponseEntity.ok(ApiResponse.success(
                createdSopCodes,
                String.format("Successfully instantiated %d SOP instances for date %s", createdSopCodes.size(), targetDate)
        ));
    }
}


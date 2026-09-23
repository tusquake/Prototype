package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import com.cloudkaptan.sop.service.TaskWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Task Workflow Management", description = "Endpoints for compliance tasks, workflow actions (submit, approve, reject), reassignment, and scheduled task cycle generation")
public class TaskController {

    private final TaskWorkflowService taskWorkflowService;
    private final com.cloudkaptan.sop.service.TaskSchedulerService taskSchedulerService;

    @PostMapping("/search")
    @Operation(summary = "Search / list tasks", description = "Returns paginated tasks filtered by entities, status, category, search, userId, userRole. Use inboxOnly=true for inbox view.")
    public ResponseEntity<ApiResponse<PageResponse<TaskDto>>> searchTasks(
            @RequestBody(required = false) TaskFilterRequest request
    ) {
        if (request == null) request = new TaskFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());

        if (Boolean.TRUE.equals(request.getInboxOnly())) {
            Page<TaskInboxView> page = taskWorkflowService.getInbox(
                    request.getEntities(), request.getStatus(), request.getUserId(), pageable);
            // Map TaskInboxView to TaskDto for uniform response
            Page<TaskDto> taskDtoPage = page.map(v -> taskWorkflowService.getTaskById(v.getTaskId()));
            return ResponseEntity.ok(ApiResponse.success(PageResponse.from(taskDtoPage)));
        }

        Page<TaskDto> page = taskWorkflowService.getTasksForUser(
                request.getEntities(), request.getUserId(), request.getUserRole(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task details by ID", description = "Retrieves comprehensive task context including history timeline, reassignment history, and attached GCS documents.")
    public ResponseEntity<ApiResponse<TaskDto>> getTaskById(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(taskWorkflowService.getTaskById(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Delete task", description = "Deletes a task record. Restricted to Admin users.")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id
    ) {
        taskWorkflowService.deleteTask(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully"));
    }

    @PostMapping("/generate-scheduled")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Trigger scheduled task cycle generation", description = "Manually triggers the orchestrator to enqueue automated task generation for active SOPs via Cloud Tasks.")
    public ResponseEntity<ApiResponse<Void>> generateScheduledTasks() {
        taskSchedulerService.generateScheduledTasks();
        return ResponseEntity.ok(ApiResponse.success(null, "Scheduled task generation dispatched to background queue successfully"));
    }

    @PutMapping("/{id}/reassign")
    @Operation(summary = "Reassign task makers and checkers", description = "Reassigns task assignment pools (Makers/Checkers) and records work continuity track.")
    public ResponseEntity<ApiResponse<TaskDto>> reassignTask(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id,
        @Valid @RequestBody TaskReassignRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.reassignTask(id, request),
            "Task assignment updated successfully"
        ));
    }

    @RequestMapping(value = "/{id}/action", method = {RequestMethod.PUT, RequestMethod.POST})
    @Operation(summary = "Execute task workflow action", description = "Executes state machine transition action (SUBMIT for review, APPROVE task, REJECT back to maker, or PERMANENTLY_REJECT). Enforces Segregation of Duties.")
    public ResponseEntity<ApiResponse<TaskDto>> executeTaskAction(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task action processed successfully"
        ));
    }
}
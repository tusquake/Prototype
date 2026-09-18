package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.dto.TaskActionRequest;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import com.cloudkaptan.sop.service.TaskWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Task Workflow Management", description = "Endpoints for compliance tasks, workflow actions (submit, approve, reject), reassignment, and scheduled task cycle generation")
public class TaskController {

    private final TaskWorkflowService taskWorkflowService;
    private final com.cloudkaptan.sop.service.TaskSchedulerService taskSchedulerService;

    @GetMapping
    @Operation(summary = "Get paginated tasks for user / entity", description = "Fetches paginated compliance tasks filtered by entity code, user identity, and user role with automatic row-level security filtering.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved task list")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Page<TaskDto>>> getTasks(
        @Parameter(description = "Corporate entity codes filter") @RequestParam(name = "entities", required = false) List<EntityCode> entities,
        @Parameter(description = "User ID or email") @RequestParam(name = "userId", required = false) String userId,
        @Parameter(description = "User role (ADMIN | MAKER | CHECKER | VIEWER)") @RequestParam(name = "userRole", required = false) String userRole,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(taskWorkflowService.getTasksForUser(entities, userId, userRole, pageable)));
    }

    @GetMapping("/inbox")
    @Operation(summary = "Get paginated task inbox view", description = "Retrieves a paginated list of tasks tailored for the user's action inbox.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved paginated inbox tasks")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Page<TaskInboxView>>> getInboxTasks(
        @Parameter(description = "Entity codes filter") @RequestParam(name = "entities", required = false) List<EntityCode> entities,
        @Parameter(description = "Task status filter") @RequestParam(name = "status", required = false) TaskStatus status,
        @Parameter(description = "User ID or email") @RequestParam(name = "userId", required = false) String userId,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(taskWorkflowService.getInbox(entities, status, userId, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task details by ID", description = "Retrieves comprehensive task context including history timeline, reassignment history, and attached GCS documents.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved task details"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDto>> getTaskById(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(taskWorkflowService.getTaskById(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Delete task", description = "Deletes a task record. Restricted to Admin users.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied — Requires Admin privileges")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Void>> deleteTask(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id
    ) {
        taskWorkflowService.deleteTask(id);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(null, "Task deleted successfully"));
    }

    @PostMapping("/generate-scheduled")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    @Operation(summary = "Trigger scheduled task cycle generation", description = "Manually triggers the orchestrator to enqueue automated task generation for active SOPs via Cloud Tasks.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Scheduled tasks dispatched to background queue successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Void>> generateScheduledTasks() {
        taskSchedulerService.generateScheduledTasks();
        // Updated message to reflect the new asynchronous Cloud Tasks architecture
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(null, "Scheduled task generation dispatched to background queue successfully"));
    }

    @PutMapping("/{id}/reassign")
    @Operation(summary = "Reassign task makers and checkers", description = "Reassigns task assignment pools (Makers/Checkers) and records work continuity track. Restricted to SOP Creators, SOP Approvers, and Admins.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task assigned Makers/Checkers updated successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDto>> reassignTask(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id,
        @Valid @RequestBody com.cloudkaptan.sop.dto.TaskReassignRequest request
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(
            taskWorkflowService.reassignTask(id, request),
            "Task assignment updated successfully"
        ));
    }

    @RequestMapping(value = "/{id}/action", method = {RequestMethod.PUT, RequestMethod.POST})
    @Operation(summary = "Execute task workflow action", description = "Executes state machine transition action (SUBMIT for review, APPROVE task, REJECT back to maker, or PERMANENTLY_REJECT). Enforces Segregation of Duties.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task action executed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid action transition or missing comment"),
        @ApiResponse(responseCode = "403", description = "Access denied — Segregation of Duties violation")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDto>> executeTaskAction(
        @Parameter(description = "UUID of the task") @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task action processed successfully"
        ));
    }
}
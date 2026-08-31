package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.TaskActionRequest;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import com.cloudkaptan.sop.service.TaskWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskWorkflowService taskWorkflowService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskDto>>> getTasks(
        @RequestParam(name = "entities", required = false) List<EntityCode> entities
    ) {
        return ResponseEntity.ok(ApiResponse.success(taskWorkflowService.getTasks(entities)));
    }

    @GetMapping("/inbox")
    public ResponseEntity<ApiResponse<Page<TaskInboxView>>> getInboxTasks(
        @RequestParam(name = "entities", required = false) List<EntityCode> entities,
        @RequestParam(name = "status", required = false) TaskStatus status,
        @RequestParam(name = "userId", required = false) String userId,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(taskWorkflowService.getInbox(entities, status, userId, pageable)));
    }

    private final com.cloudkaptan.sop.service.TaskSchedulerService taskSchedulerService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskDto>> getTaskById(
        @PathVariable("id") UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(taskWorkflowService.getTaskById(id)));
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
        @PathVariable("id") UUID id
    ) {
        taskWorkflowService.deleteTask(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully"));
    }

    @PostMapping("/generate-scheduled")
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('fin_sop_admin')")
    public ResponseEntity<ApiResponse<Void>> generateScheduledTasks() {
        taskSchedulerService.generateScheduledTasks();
        return ResponseEntity.ok(ApiResponse.success(null, "Scheduled tasks generated successfully"));
    }

    @RequestMapping(value = "/{id}/action", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<ApiResponse<TaskDto>> executeTaskAction(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task action processed successfully"
        ));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<TaskDto>> submitTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        request.setAction("SUBMIT");
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task submitted successfully"
        ));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<TaskDto>> approveTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        request.setAction("APPROVE");
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task approved successfully"
        ));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<TaskDto>> rejectTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        if (request.getAction() == null) request.setAction("REJECT");
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.processTaskAction(id, request),
            "Task rejected successfully"
        ));
    }
}

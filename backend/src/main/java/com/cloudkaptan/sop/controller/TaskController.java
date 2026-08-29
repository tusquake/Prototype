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

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<TaskDto>> submitTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.submitTask(id, request.getActorId(), request.getComment()),
            "Task submitted successfully"
        ));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<TaskDto>> approveTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.approveTask(id, request.getActorId(), request.getComment()),
            "Task approved successfully"
        ));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<TaskDto>> rejectTask(
        @PathVariable("id") UUID id,
        @Valid @RequestBody TaskActionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
            taskWorkflowService.rejectTask(id, request.getActorId(), request.getComment()),
            "Task rejected successfully"
        ));
    }
}

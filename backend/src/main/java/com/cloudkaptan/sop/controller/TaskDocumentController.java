package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.service.TaskDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks/{taskId}/documents")
@RequiredArgsConstructor
@Tag(name = "Task Documents & Signed URL Storage", description = "Serverless-optimized Signed URL generation, direct upload confirmation, listing, and deletion with strict RBAC")
public class TaskDocumentController {

    private final TaskDocumentService taskDocumentService;

    @PostMapping("/generate-upload-url")
    @Operation(summary = "Generate 15-min PUT Signed URL for upload", description = "Generates a short-lived PUT Signed URL (GCS in Prod / MinIO S3 in Local) for uploading task working paper attachments directly.")
    public ResponseEntity<ApiResponse<GenerateUploadUrlResponse>> generateUploadUrl(
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody GenerateUploadUrlRequest request) {
        request.setTaskId(taskId);
        GenerateUploadUrlResponse response = taskDocumentService.generateUploadSignedUrl(
                taskId, request.getFileName(), request.getContentType(), request.getActorId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/confirm-upload")
    @Operation(summary = "Confirm upload completion & tag SLA", description = "Confirms direct upload completion and saves task document metadata with SLA timing (ON_TIME vs LATE).")
    public ResponseEntity<ApiResponse<TaskDocumentDto>> confirmUpload(
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody ConfirmUploadRequest request) {
        request.setTaskId(taskId);
        TaskDocumentDto dto = taskDocumentService.confirmUpload(
                taskId, request.getFileName(), request.getGcsObjectPath(),
                request.getFileSize(), request.getContentType(), request.getActorId());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/{documentId}/generate-download-url")
    @Operation(summary = "Generate 5-min GET Signed URL for view/download", description = "Generates a short-lived GET Signed URL for viewing or downloading task working paper attachments directly. Global Admins explicitly denied unless in direct task hierarchy.")
    public ResponseEntity<ApiResponse<GenerateDownloadUrlResponse>> generateDownloadUrl(
            @PathVariable("taskId") UUID taskId,
            @PathVariable("documentId") UUID documentId,
            @RequestParam("actorId") String actorId) {
        GenerateDownloadUrlResponse response = taskDocumentService.generateDownloadSignedUrl(taskId, documentId, actorId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @Operation(summary = "List attached documents for task", description = "Retrieves all document metadata attached to a task ordered by upload date descending.")
    public ResponseEntity<ApiResponse<List<TaskDocumentDto>>> getDocuments(
            @PathVariable("taskId") UUID taskId) {
        List<TaskDocumentDto> documents = taskDocumentService.getTaskDocuments(taskId);
        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Delete task document", description = "Deletes document metadata and storage object. Restricted to original uploader or Admin in hierarchy.")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable("taskId") UUID taskId,
            @PathVariable("documentId") UUID documentId,
            @RequestParam("actorId") String actorId) {
        taskDocumentService.deleteTaskDocument(taskId, documentId, actorId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}

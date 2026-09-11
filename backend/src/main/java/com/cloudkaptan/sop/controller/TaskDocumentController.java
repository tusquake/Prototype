package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.service.TaskDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Upload Signed URL generated successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied — User not in task hierarchy")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<GenerateUploadUrlResponse>> generateUploadUrl(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody GenerateUploadUrlRequest request) {
        request.setTaskId(taskId);
        GenerateUploadUrlResponse response = taskDocumentService.generateUploadSignedUrl(
                taskId, request.getFileName(), request.getContentType(), request.getActorId());
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(response));
    }

    @PostMapping("/confirm-upload")
    @Operation(summary = "Confirm upload completion & tag SLA", description = "Confirms direct upload completion and saves task document metadata with SLA timing (ON_TIME vs LATE).")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Upload confirmed and metadata saved successfully")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDocumentDto>> confirmUpload(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody ConfirmUploadRequest request) {
        request.setTaskId(taskId);
        TaskDocumentDto dto = taskDocumentService.confirmUpload(
                taskId, request.getFileName(), request.getGcsObjectPath(),
                request.getFileSize(), request.getContentType(), request.getActorId());
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(dto));
    }

    @GetMapping("/{documentId}/generate-download-url")
    @Operation(summary = "Generate 5-min GET Signed URL for view/download", description = "Generates a short-lived GET Signed URL for viewing or downloading task working paper attachments directly. Global Admins explicitly denied unless in direct task hierarchy.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Download Signed URL generated successfully"),
        @ApiResponse(responseCode = "403", description = "Access Denied — User/Admin not part of direct task hierarchy or manager downline")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<GenerateDownloadUrlResponse>> generateDownloadUrl(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Parameter(description = "Document UUID") @PathVariable("documentId") UUID documentId,
            @Parameter(description = "Actor User ID") @RequestParam("actorId") String actorId) {
        GenerateDownloadUrlResponse response = taskDocumentService.generateDownloadSignedUrl(taskId, documentId, actorId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(response));
    }

    @GetMapping
    @Operation(summary = "List attached documents for task", description = "Retrieves all document metadata attached to a task ordered by upload date descending.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved attached documents list")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<List<TaskDocumentDto>>> getDocuments(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId) {
        List<TaskDocumentDto> documents = taskDocumentService.getTaskDocuments(taskId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(documents));
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Delete task document", description = "Deletes document metadata and storage object. Restricted to original uploader or Admin in hierarchy.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Document deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied — User not authorized to delete document")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<Void>> deleteDocument(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Parameter(description = "Document UUID") @PathVariable("documentId") UUID documentId,
            @Parameter(description = "Actor User ID") @RequestParam("actorId") String actorId) {
        taskDocumentService.deleteTaskDocument(taskId, documentId, actorId);
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(null));
    }
}


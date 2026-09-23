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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks/{taskId}/documents")
@RequiredArgsConstructor
@Tag(name = "Task Documents & Signed URL Storage", description = "Serverless-optimized Signed URL generation, direct upload confirmation, listing, and deletion with strict RBAC")
public class TaskDocumentController {

    private static final Logger log = LoggerFactory.getLogger(TaskDocumentController.class);

    private final TaskDocumentService taskDocumentService;

    @PostMapping("/generate-upload-url")
    @Operation(summary = "Generate 15-min PUT Signed URL for document upload", description = "Generates a serverless 15-minute PUT Signed URL for uploading working paper attachments directly to GCS bucket.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Upload Signed URL generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload or file parameters")
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
    @Operation(summary = "Confirm uploaded document metadata", description = "Registers document metadata after successful GCS direct upload. Required before document can be attached to task.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Document metadata confirmed and saved"),
        @ApiResponse(responseCode = "400", description = "Missing or invalid document metadata")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDocumentDto>> confirmUpload(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody ConfirmUploadRequest request) {
        request.setTaskId(taskId);
        TaskDocumentDto dto = taskDocumentService.confirmUpload(
                taskId, request.getFileName(), request.getGcsObjectPath(),
                request.getFileSize(), request.getContentType(), request.getActorId(),
                request.getIsResubmission(), request.getReplacedDocumentId(), request.getRequiredDocumentId());
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

    @PutMapping("/{documentId}/action")
    @Operation(summary = "Approve or reject individual task document", description = "Checker/Approver approves or rejects an attached document. Rejection requires a mandatory comment. Resubmissions reset status to PENDING_REVIEW.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Document review status updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid review action or missing mandatory rejection comment"),
        @ApiResponse(responseCode = "403", description = "Access denied — User not authorized in task hierarchy")
    })
    public ResponseEntity<com.cloudkaptan.sop.dto.ApiResponse<TaskDocumentDto>> actionDocument(
            @Parameter(description = "Task UUID") @PathVariable("taskId") UUID taskId,
            @Parameter(description = "Document UUID") @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody ActionTaskDocumentRequest request) {
        TaskDocumentDto dto = taskDocumentService.actionTaskDocument(
                taskId, documentId, request.getAction(), request.getComment(), request.getActorId());
        return ResponseEntity.ok(com.cloudkaptan.sop.dto.ApiResponse.success(dto));
    }

    @PutMapping(value = "/local-upload", consumes = MediaType.ALL_VALUE)
    @Operation(summary = "Local development direct storage upload handler", description = "Receives direct stream upload in local profile mode and saves file to local storage directory.")
    public ResponseEntity<Void> handleLocalStorageUpload(
            @Parameter(description = "Object Path") @RequestParam("objectPath") String objectPath,
            @RequestHeader(value = "Content-Type", required = false) String contentType,
            @RequestBody byte[] fileBytes) {
        try {
            String decodedPath = URLDecoder.decode(objectPath, StandardCharsets.UTF_8);
            ByteArrayInputStream is = new ByteArrayInputStream(fileBytes);
            taskDocumentService.uploadLocalFile(decodedPath, is, contentType, fileBytes.length);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Local upload failed for objectPath '{}': {}", objectPath, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/local-download")
    @Operation(summary = "Local development direct storage download handler", description = "Streams file content directly from local storage directory in local profile mode.")
    public ResponseEntity<Resource> handleLocalStorageDownload(
            @Parameter(description = "Object Path") @RequestParam("objectPath") String objectPath) {
        try {
            String decodedPath = URLDecoder.decode(objectPath, StandardCharsets.UTF_8);
            InputStream is = taskDocumentService.downloadLocalFileStream(decodedPath);
            InputStreamResource resource = new InputStreamResource(is);
            String filename = Paths.get(decodedPath).getFileName().toString();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (Exception e) {
            log.error("Local download failed for objectPath '{}': {}", objectPath, e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
}

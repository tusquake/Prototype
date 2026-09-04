package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.TaskDocumentDto;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.service.TaskDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/tasks/{taskId}/documents")
@Tag(name = "Task Documents & GCS Storage", description = "Endpoints for uploading, listing, proxy streaming download, and deleting task working paper attachments stored in GCS")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final TaskDocumentService taskDocumentService;

    public DocumentController(TaskDocumentService taskDocumentService) {
        this.taskDocumentService = taskDocumentService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload document to task (GCS Storage)", description = "Uploads a file attachment (PDF, Excel, Word, images up to 25MB) to GCS and associates metadata with the task. Enforces RBAC permissions.")
    @ApiResponse(responseCode = "201", description = "Document uploaded successfully")
    @ApiResponse(responseCode = "400", description = "Invalid file or task ID")
    @ApiResponse(responseCode = "403", description = "User not authorized to upload documents to this task")
    public ResponseEntity<TaskDocumentDto> uploadDocument(
            @Parameter(description = "UUID of the task") @PathVariable UUID taskId,
            @Parameter(description = "Multipart file binary payload") @RequestParam("file") MultipartFile file,
            @Parameter(description = "User ID or email of actor uploading the file") @RequestParam("actorId") String actorId) {
        log.info("REST upload request for task ID {}, filename '{}', actor '{}'", taskId, file.getOriginalFilename(), actorId);
        TaskDocumentDto dto = taskDocumentService.uploadTaskDocument(taskId, file, actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    @Operation(summary = "List attached documents for task", description = "Retrieves all uploaded document attachments for a specific task ordered by upload time descending.")
    @ApiResponse(responseCode = "200", description = "List of task documents retrieved")
    public ResponseEntity<List<TaskDocumentDto>> getDocuments(
            @Parameter(description = "UUID of the task") @PathVariable UUID taskId) {
        List<TaskDocumentDto> documents = taskDocumentService.getTaskDocuments(taskId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}/download")
    @Operation(summary = "Stream download document (Backend Proxy)", description = "Streams document binary content via Spring Boot backend proxy after verifying strict user RBAC permissions.")
    @ApiResponse(responseCode = "200", description = "Document binary stream")
    @ApiResponse(responseCode = "403", description = "Access denied to task document")
    @ApiResponse(responseCode = "404", description = "Document or Task not found")
    public ResponseEntity<InputStreamResource> downloadDocument(
            @Parameter(description = "UUID of the task") @PathVariable UUID taskId,
            @Parameter(description = "UUID of the document") @PathVariable UUID documentId,
            @Parameter(description = "User ID or email of actor requesting download") @RequestParam("actorId") String actorId) {
        log.info("REST download request for document ID {} on task ID {}, actor '{}'", documentId, taskId, actorId);
        TaskDocument docMetadata = taskDocumentService.getTaskDocument(taskId, documentId);
        InputStream fileStream = taskDocumentService.downloadTaskDocumentStream(taskId, documentId, actorId);

        String contentType = docMetadata.getContentType();
        if (contentType == null || contentType.trim().isEmpty()) {
            contentType = "application/octet-stream";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + docMetadata.getFileName() + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(docMetadata.getFileSize())
                .contentType(MediaType.parseMediaType(contentType))
                .body(new InputStreamResource(fileStream));
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Delete task document", description = "Deletes document metadata and GCS storage object. Restricted strictly to document uploader and Admins.")
    @ApiResponse(responseCode = "240", description = "Document deleted successfully")
    @ApiResponse(responseCode = "403", description = "Only uploader or Admin can delete document")
    public ResponseEntity<Void> deleteDocument(
            @Parameter(description = "UUID of the task") @PathVariable UUID taskId,
            @Parameter(description = "UUID of the document") @PathVariable UUID documentId,
            @Parameter(description = "User ID or email of actor requesting deletion") @RequestParam("actorId") String actorId) {
        log.info("REST delete request for document ID {} on task ID {}, actor '{}'", documentId, taskId, actorId);
        taskDocumentService.deleteTaskDocument(taskId, documentId, actorId);
        return ResponseEntity.noContent().build();
    }
}

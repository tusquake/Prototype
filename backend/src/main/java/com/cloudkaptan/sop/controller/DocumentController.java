package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.TaskDocumentDto;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.service.TaskDocumentService;
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
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final TaskDocumentService taskDocumentService;

    public DocumentController(TaskDocumentService taskDocumentService) {
        this.taskDocumentService = taskDocumentService;
    }

    @PostMapping
    public ResponseEntity<TaskDocumentDto> uploadDocument(
            @PathVariable UUID taskId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("actorId") String actorId) {
        log.info("REST upload request for task ID {}, filename '{}', actor '{}'", taskId, file.getOriginalFilename(), actorId);
        TaskDocumentDto dto = taskDocumentService.uploadTaskDocument(taskId, file, actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    public ResponseEntity<List<TaskDocumentDto>> getDocuments(@PathVariable UUID taskId) {
        List<TaskDocumentDto> documents = taskDocumentService.getTaskDocuments(taskId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<InputStreamResource> downloadDocument(
            @PathVariable UUID taskId,
            @PathVariable UUID documentId,
            @RequestParam("actorId") String actorId) {
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
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID taskId,
            @PathVariable UUID documentId,
            @RequestParam("actorId") String actorId) {
        log.info("REST delete request for document ID {} on task ID {}, actor '{}'", documentId, taskId, actorId);
        taskDocumentService.deleteTaskDocument(taskId, documentId, actorId);
        return ResponseEntity.noContent().build();
    }
}

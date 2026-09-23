package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.TenantContext;
import com.cloudkaptan.sop.domain.enums.*;
import com.cloudkaptan.sop.domain.state.document.DocumentContext;
import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.entity.*;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.TaskDocumentRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.RequiredDocumentRepository;
import com.cloudkaptan.sop.repository.TaskCommentRepository;
import com.cloudkaptan.sop.repository.TaskEventRepository;

@Service
public class TaskDocumentService {

    private static final Logger log = LoggerFactory.getLogger(TaskDocumentService.class);

    private final Storage storage;
    private final TaskRepository taskRepository;
    private final TaskDocumentRepository taskDocumentRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final Environment environment;
    private final AuditLogRepository auditLogRepository;
    private final TaskEventRepository taskEventRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final RequiredDocumentRepository requiredDocumentRepository;
    
    @Value("${gcp.gcs.bucket-name:finsop-task-documents}")
    private String bucketName;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${server.port:8080}")
    private String serverPort;

    @Autowired
    public TaskDocumentService(Storage storage,
                               TaskRepository taskRepository,
                               TaskDocumentRepository taskDocumentRepository,
                               UserRepository userRepository,
                               StorageService storageService,
                               Environment environment,
                               AuditLogRepository auditLogRepository,
                               TaskEventRepository taskEventRepository,
                               TaskCommentRepository taskCommentRepository,
                               RequiredDocumentRepository requiredDocumentRepository) {
        this.storage = storage;
        this.taskRepository = taskRepository;
        this.taskDocumentRepository = taskDocumentRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.environment = environment;
        this.auditLogRepository = auditLogRepository;
        this.taskEventRepository = taskEventRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.requiredDocumentRepository = requiredDocumentRepository;
    }

    /**
     * 1. Generate Upload (PUT) Signed URL (Valid for 15 minutes)
     * Prod Profile: GCS V4 Signed URL
     * Local Profile: MinIO S3 Pre-Signed URL (Docker container on port 9000)
     */
    @Transactional(readOnly = true)
    public GenerateUploadUrlResponse generateUploadSignedUrl(UUID taskId, String fileName, String contentType, String actorId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        User actor = resolveUser(actorId);

        // Strict RBAC Validation (Global Admins explicitly denied unless in hierarchy)
        validateTaskAccess(task, actor);

        String originalFilename = (fileName != null && !fileName.trim().isEmpty())
                ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "document";

        // Construct Path: {year}/{categoryCode}/{sopCode}/{taskRecordNo}/{UUID}-{filename}
        Sop sop = task.getSop();
        String categoryCode = (sop != null && sop.getProcessCategory() != null) ? sop.getProcessCategory() : "GENERAL";
        String sopCode = (sop != null && sop.getSopCode() != null) ? sop.getSopCode() : "SOP";
        String taskRecordNo = task.getRecordNo() != null ? task.getRecordNo() : taskId.toString();

        String year = "2026";
        if (task.getPeriodKey() != null && task.getPeriodKey().length() >= 4) {
            year = task.getPeriodKey().substring(0, 4);
        }

        String objectPath = String.format("%s/%s/%s/%s/%s-%s",
                year, categoryCode, sopCode, taskRecordNo, UUID.randomUUID(), originalFilename);

        String mimeType = (contentType != null && !contentType.trim().isEmpty())
                ? contentType : "application/octet-stream";

        String signedUrl;
        boolean isProd = isProdProfile();

        if (isProd) {
            // PROD PROFILE: Generate GCS V4 Signed URL
            try {
                BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectPath))
                        .setContentType(mimeType)
                        .build();

                URL url = storage.signUrl(
                        blobInfo,
                        15, TimeUnit.MINUTES,
                        Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                        Storage.SignUrlOption.withV4Signature()
                );
                signedUrl = url.toString();
            } catch (Exception e) {
                log.error("Failed to generate GCS V4 PUT Signed URL in PROD: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate GCS Upload Signed URL: " + e.getMessage(), e);
            }
        } else {
            // LOCAL PROFILE: Generate Local Backend Direct Upload Endpoint
            try {
                String encodedPath = URLEncoder.encode(objectPath, StandardCharsets.UTF_8);
                signedUrl = String.format("http://localhost:%s/finsop/v1/tasks/%s/documents/local-upload?objectPath=%s",
                        serverPort, taskId, encodedPath);
                log.info("LOCAL PROFILE: Generated Local Backend Direct Upload Endpoint: {}", signedUrl);
            } catch (Exception e) {
                log.error("Failed to generate Local Upload Endpoint: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate Local Upload Endpoint: " + e.getMessage(), e);
            }
        }

        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(15);
        log.info("Generated 15-min PUT Signed URL for actor '{}' on task '{}' at path '{}'", actorId, taskId, objectPath);

        return GenerateUploadUrlResponse.builder()
                .taskId(taskId)
                .fileName(originalFilename)
                .gcsObjectPath(objectPath)
                .uploadUrl(signedUrl)
                .expiresAt(expiresAt)
                .build();
    }

    /**
     * 2. Confirm Upload Completion & Tag SLA (ON_TIME vs LATE)
     */
    @Transactional
    public TaskDocumentDto confirmUpload(UUID taskId, String fileName, String gcsObjectPath, Long fileSize, String contentType, String actorId) {
        return confirmUpload(taskId, fileName, gcsObjectPath, fileSize, contentType, actorId, false, null, null);
    }

    @Transactional
    public TaskDocumentDto confirmUpload(UUID taskId, String fileName, String gcsObjectPath, Long fileSize, String contentType, String actorId, Boolean isResubmission, UUID replacedDocumentId, UUID requiredDocumentId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
    RequiredDocument requiredDocument =
        requiredDocumentRepository.findById(requiredDocumentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Required document not found with id: " + requiredDocumentId));
        
    if (!requiredDocument.getTaskTemplate().getTaskTemplateId()
        .equals(task.getTaskTemplateId())) {
    throw new IllegalArgumentException(
            "Required document does not belong to the task template"
    );
}

        User actor = resolveUser(actorId);

        // Strict RBAC Validation
        validateTaskAccess(task, actor);

        // Submission Lock Validation: Cannot upload if task is pending review or completed/locked
        if (task.getStatus() == TaskStatus.PENDING_REVIEW || 
            task.getStatus() == TaskStatus.APPROVED || 
            task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new AccessDeniedException("Task evidence documents cannot be uploaded while task is submitted, approved, or locked.");
        }

        boolean resubmit = Boolean.TRUE.equals(isResubmission) || task.getStatus() == TaskStatus.REJECTED;

        // Tag SLA Timing
        UploadTiming timing = UploadTiming.ON_TIME;
        if (task.getDueDate() != null) {
            LocalDate today = OffsetDateTime.now().atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
            if (today.isAfter(task.getDueDate())) {
                timing = UploadTiming.LATE;
            }
        }

        TaskDocument document = TaskDocument.builder()
                .task(task)
                .fileName(fileName)
                .gcsObjectPath(gcsObjectPath)
                .fileSize(fileSize != null ? fileSize : 0L)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .uploadedBy(actor)
                .uploadTiming(timing)
                .isResubmission(resubmit)
                .replacedDocumentId(replacedDocumentId)
                .status(DocumentStatus.PENDING_REVIEW)
                .requiredDocument(requiredDocument)
                .build();

        TaskDocument saved = taskDocumentRepository.save(document);
        log.info("Confirmed upload for task '{}', doc ID '{}', SLA timing: {}, resubmit: {}", taskId, saved.getDocumentId(), timing, resubmit);

        // Save Task-Level Audit Logs & Activity History
        String action = resubmit ? "DOCUMENT_RESUBMITTED" : "DOCUMENT_UPLOADED";
        String taskRecordNo = task.getRecordNo() != null ? task.getRecordNo() : taskId.toString();

        auditLogRepository.save(AuditLog.builder()
                .actorId(actor.getUserId())
                .action(action)
                .entityType("TASK")
                .entityId(taskRecordNo)
                .correlationId(UUID.randomUUID().toString())
                .build());

        taskEventRepository.save(TaskEvent.builder()
                .task(task)
                .actor(actor)
                .action(action)
                .fromStatus(task.getStatus())
                .toStatus(task.getStatus())
                .build());

        taskCommentRepository.save(TaskComment.builder()
                .task(task)
                .author(actor)
                .commentText("Uploaded evidence file: " + fileName + (resubmit ? " (Re-submitted in place of rejected document)" : ""))
                .build());

        return mapToDto(saved);
    }

    /**
     * 3. Generate Download (GET) Signed URL (Valid for 5 minutes)
     * Prod Profile: GCS V4 GET Signed URL
     * Local Profile: Direct Local Stream Download Endpoint
     */
    @Transactional(readOnly = true)
    public GenerateDownloadUrlResponse generateDownloadSignedUrl(UUID taskId, UUID documentId, String actorId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        TaskDocument document = taskDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        if (!document.getTask().getTaskId().equals(taskId)) {
            throw new IllegalArgumentException("Document ID " + documentId + " does not belong to task ID " + taskId);
        }

        User actor = resolveUser(actorId);

        // Strict RBAC Validation (Global Admins explicitly denied unless in hierarchy)
        validateTaskAccess(task, actor);

        String signedUrl;
        boolean isProd = isProdProfile();

        if (isProd) {
            // PROD PROFILE: Generate GCS V4 GET Signed URL
            try {
                BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, document.getGcsObjectPath())).build();

                URL url = storage.signUrl(
                        blobInfo,
                        5, TimeUnit.MINUTES,
                        Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                        Storage.SignUrlOption.withV4Signature()
                );
                signedUrl = url.toString();
            } catch (Exception e) {
                log.error("Failed to generate GCS V4 GET Signed URL in PROD: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate GCS Download Signed URL: " + e.getMessage(), e);
            }
        } else {
            // LOCAL PROFILE: Generate Local Backend Direct Download Endpoint
            try {
                String encodedPath = URLEncoder.encode(document.getGcsObjectPath(), StandardCharsets.UTF_8);
                signedUrl = String.format("http://localhost:%s/finsop/v1/tasks/%s/documents/local-download?objectPath=%s",
                        serverPort, taskId, encodedPath);
                log.info("LOCAL PROFILE: Generated Local Backend Direct Download Endpoint: {}", signedUrl);
            } catch (Exception e) {
                log.error("Failed to generate Local Download Endpoint: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate Local Download Endpoint: " + e.getMessage(), e);
            }
        }

        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(5);
        log.info("Generated 5-min GET Signed URL for actor '{}' on doc '{}'", actorId, documentId);

        return GenerateDownloadUrlResponse.builder()
                .documentId(documentId)
                .taskId(taskId)
                .fileName(document.getFileName())
                .downloadUrl(signedUrl)
                .expiresAt(expiresAt)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TaskDocumentDto> getTaskDocuments(UUID taskId) {
        return taskDocumentRepository.findByTaskTaskIdOrderByUploadedAtDesc(taskId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteTaskDocument(UUID taskId, UUID documentId, String actorId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        TaskDocument document = taskDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        if (!document.getTask().getTaskId().equals(taskId)) {
            throw new IllegalArgumentException("Document ID " + documentId + " does not belong to task ID " + taskId);
        }

        User actor = resolveUser(actorId);
        validateTaskAccess(task, actor);

        // Approver Restriction: Approvers/Checkers CANNOT delete documents!
        List<String> checkerIds = (task.getAssignedCheckerIds() != null && !task.getAssignedCheckerIds().isEmpty())
                ? task.getAssignedCheckerIds()
                : (task.getChecker() != null ? List.of(task.getChecker().getUserId()) : List.of());

        boolean isAssignedChecker = checkerIds.contains(actor.getUserId()) || (actor.getEmail() != null && checkerIds.contains(actor.getEmail()));
        boolean isMaker = (task.getMaker() != null && actor.getUserId().equals(task.getMaker().getUserId()))
                || (task.getAssignedMakerIds() != null && task.getAssignedMakerIds().contains(actor.getUserId()))
                || (document.getUploadedBy() != null && actor.getUserId().equals(document.getUploadedBy().getUserId()));

        if (isAssignedChecker && !isMaker) {
            throw new AccessDeniedException("Access Denied: Approvers cannot delete task evidence documents. Approvers can only view, approve, or reject documents.");
        }

        // Submission Lock Check & Audit Protection: Cannot delete APPROVED or REJECTED docs
        if (document.getStatus() == DocumentStatus.APPROVED ||
            document.getStatus() == DocumentStatus.REJECTED) {
            throw new AccessDeniedException("Approved or Rejected evidence documents cannot be deleted; they are preserved for audit history.");
        }

        // Submission Lock Check: Cannot delete docs when task is submitted/pending review or completed
        if (task.getStatus() == TaskStatus.PENDING_REVIEW ||
            task.getStatus() == TaskStatus.APPROVED ||
            task.getStatus() == TaskStatus.PERMANENTLY_REJECTED) {
            throw new AccessDeniedException("Task documents cannot be deleted while task is submitted or locked.");
        }

        if (isProdProfile()) {
            storage.delete(BlobId.of(bucketName, document.getGcsObjectPath()));
        } else {
            storageService.deleteFile(document.getGcsObjectPath());
        }

        taskDocumentRepository.delete(document);
        log.info("Deleted document ID {} from task ID {}", documentId, taskId);

        // Save Task-Level Audit Logs & Activity History
        String taskRecordNo = task.getRecordNo() != null ? task.getRecordNo() : taskId.toString();

        auditLogRepository.save(AuditLog.builder()
                .actorId(actor.getUserId())
                .action("DOCUMENT_DELETED")
                .entityType("TASK")
                .entityId(taskRecordNo)
                .correlationId(UUID.randomUUID().toString())
                .build());

        taskEventRepository.save(TaskEvent.builder()
                .task(task)
                .actor(actor)
                .action("DOCUMENT_DELETED")
                .fromStatus(task.getStatus())
                .toStatus(task.getStatus())
                .build());

        taskCommentRepository.save(TaskComment.builder()
                .task(task)
                .author(actor)
                .commentText("Deleted evidence file: " + document.getFileName())
                .build());
    }

    /**
     * Strict Object-Level RBAC & Zero-Trust Visibility Rule Engine
     */
    private void validateTaskAccess(Task task, User actor) {
        String userId = actor.getUserId();
        String email = actor.getEmail() != null ? actor.getEmail().toLowerCase() : "";

        List<String> authorizedIds = new ArrayList<>();
        authorizedIds.add(userId);
        if (!email.isEmpty()) authorizedIds.add(email);

        TenantContext context = TenantContext.getContext();
        if (context != null) {
            if (context.getReadableSubordinateIds() != null) {
                authorizedIds.addAll(context.getReadableSubordinateIds());
            }
            if (context.getWritableSubordinateIds() != null) {
                authorizedIds.addAll(context.getWritableSubordinateIds());
            }
        }

        boolean isDirectOrManagerParticipant = isUserInTaskHierarchy(task, authorizedIds);

        // Global System Administrators are EXPLICITLY DENIED access unless part of direct task hierarchy
        if (actor.getRole() == UserRole.ADMIN) {
            if (!isDirectOrManagerParticipant) {
                log.warn("RBAC Violation: Admin user '{}' is EXPLICITLY DENIED access for task '{}' (not part of direct task hierarchy)", userId, task.getTaskId());
                throw new AccessDeniedException("Access Denied: Global System Administrators are explicitly denied access to generate task document Signed URLs unless part of the direct task hierarchy.");
            }
        }

        if (!isDirectOrManagerParticipant) {
            log.warn("RBAC Violation: User '{}' is not authorized for task '{}'", userId, task.getTaskId());
            throw new AccessDeniedException("Access Denied: You are not an authorized participant (Maker/Checker) or downline Manager for this task.");
        }
    }

    private boolean isUserInTaskHierarchy(Task task, List<String> authorizedIds) {
        if (task.getMaker() != null && matchesUser(task.getMaker(), authorizedIds)) return true;
        if (task.getChecker() != null && matchesUser(task.getChecker(), authorizedIds)) return true;

        if (containsAny(task.getAssignedMakerIds(), authorizedIds)) return true;
        if (containsAny(task.getAssignedCheckerIds(), authorizedIds)) return true;

        Sop sop = task.getSop();
        if (sop != null) {
            if (sop.getCreatedBy() != null && matchesUser(sop.getCreatedBy(), authorizedIds)) return true;
            if (containsAny(sop.getAssignedCreatorIds(), authorizedIds)) return true;
            if (containsAny(sop.getAssignedApproverIds(), authorizedIds)) return true;
            if (sop.getAssignedCreatorId() != null && authorizedIds.contains(sop.getAssignedCreatorId())) return true;
            if (sop.getAssignedApproverId() != null && authorizedIds.contains(sop.getAssignedApproverId())) return true;
        }

        return false;
    }

    private boolean matchesUser(User user, List<String> authorizedIds) {
        if (user == null) return false;
        if (authorizedIds.contains(user.getUserId())) return true;
        return user.getEmail() != null && authorizedIds.contains(user.getEmail().toLowerCase());
    }

    private boolean containsAny(List<String> list, List<String> authorizedIds) {
        if (list == null || list.isEmpty()) return false;
        return !Collections.disjoint(list, authorizedIds);
    }

    private User resolveUser(String actorId) {
        if (actorId == null || actorId.trim().isEmpty()) {
            throw new IllegalArgumentException("Actor ID is required for document operations.");
        }
        return userRepository.findById(actorId)
                .orElseGet(() -> userRepository.findByEmail(actorId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found for ID/email: " + actorId)));
    }

    private boolean isProdProfile() {
        if ("gcs".equalsIgnoreCase(storageType)) return true;
        if (environment != null && environment.getActiveProfiles() != null) {
            return Arrays.asList(environment.getActiveProfiles()).contains("prod");
        }
        return false;
    }

    @Transactional
    public TaskDocumentDto actionTaskDocument(UUID taskId, UUID documentId, String action, String comment, String actorId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        TaskDocument document = taskDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        if (!document.getTask().getTaskId().equals(taskId)) {
            throw new IllegalArgumentException("Document ID " + documentId + " does not belong to task ID " + taskId);
        }

        User actor = resolveUser(actorId);
        validateTaskAccess(task, actor);

        if (document.getStatus() == DocumentStatus.REJECTED) {
            throw new IllegalStateException("This document was previously rejected and cannot be modified. It is retained for audit history.");
        }

        DocumentContext documentContext = new DocumentContext(document);
        String eventAction;
        if ("APPROVE".equalsIgnoreCase(action)) {
            documentContext.approve(actor);
            eventAction = "DOCUMENT_APPROVED";
        } else if ("REJECT".equalsIgnoreCase(action)) {
            documentContext.reject(actor, comment);
            eventAction = "DOCUMENT_REJECTED";
        } else {
            throw new IllegalArgumentException("Invalid document review action: " + action + ". Allowed values: APPROVE, REJECT.");
        }

        TaskDocument saved = taskDocumentRepository.save(document);

        log.info("Document ID {} on task ID {} was {} by actor '{}'", documentId, taskId, action, actorId);

        // Save Task-Level Audit Logs & Activity History
        String taskRecordNo = task.getRecordNo() != null ? task.getRecordNo() : taskId.toString();

        auditLogRepository.save(AuditLog.builder()
                .actorId(actor.getUserId())
                .action(eventAction)
                .entityType("TASK")
                .entityId(taskRecordNo)
                .correlationId(UUID.randomUUID().toString())
                .build());

        taskEventRepository.save(TaskEvent.builder()
                .task(task)
                .actor(actor)
                .action(eventAction)
                .fromStatus(task.getStatus())
                .toStatus(task.getStatus())
                .build());

        taskCommentRepository.save(TaskComment.builder()
                .task(task)
                .author(actor)
                .commentText(("APPROVE".equalsIgnoreCase(action) ? "Approved" : "Rejected") + " evidence file: " + document.getFileName() + (comment != null && !comment.isBlank() ? ". Reason: " + comment : ""))
                .build());

        return mapToDto(saved);
    }

    private TaskDocumentDto mapToDto(TaskDocument document) {
        if (document == null) return null;
        return TaskDocumentDto.builder()
                .documentId(document.getDocumentId())
                .taskId(document.getTask().getTaskId())
                .fileName(document.getFileName())
                .gcsObjectPath(document.getGcsObjectPath())
                .fileSize(document.getFileSize())
                .contentType(document.getContentType())
                .uploadedById(document.getUploadedBy() != null ? document.getUploadedBy().getUserId() : null)
                .uploadedByName(document.getUploadedBy() != null ? document.getUploadedBy().getFullName() : null)
                .uploadedAt(document.getUploadedAt())
                .status(document.getStatus() != null ? document.getStatus() : DocumentStatus.PENDING_REVIEW)
                .rejectionReason(document.getRejectionReason())
                .actionedById(document.getActionedById())
                .actionedByName(document.getActionedByName())
                .actionedAt(document.getActionedAt())
                .isResubmission(Boolean.TRUE.equals(document.getIsResubmission()))
                .replacedDocumentId(document.getReplacedDocumentId())
                .requiredDocumentId(document.getRequiredDocument() != null ? document.getRequiredDocument().getRequiredDocumentId() : null)
                .documentCategory(document.getRequiredDocument() != null ? document.getRequiredDocument().getName() : null)
                .build();
    }

    public void uploadLocalFile(String objectPath, java.io.InputStream inputStream, String contentType, long contentLength) {
        storageService.uploadFile(objectPath, inputStream, contentType, contentLength);
    }

    public java.io.InputStream downloadLocalFileStream(String objectPath) {
        return storageService.downloadFileStream(objectPath);
    }
}

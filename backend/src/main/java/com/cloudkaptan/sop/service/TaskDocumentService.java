package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.TenantContext;
import com.cloudkaptan.sop.domain.enums.UploadTiming;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.TaskDocumentRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.SetBucketPolicyArgs;
import io.minio.http.Method;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class TaskDocumentService {

    private static final Logger log = LoggerFactory.getLogger(TaskDocumentService.class);

    private final Storage storage;
    private final MinioClient minioClient;
    private final TaskRepository taskRepository;
    private final TaskDocumentRepository taskDocumentRepository;
    private final UserRepository userRepository;
    private final Environment environment;

    @Value("${gcp.gcs.bucket-name:finsop-task-documents}")
    private String bucketName;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.minio-endpoint:http://127.0.0.1:9000}")
    private String minioEndpoint;

    @Value("${app.storage.minio-public-endpoint:http://localhost:9000}")
    private String minioPublicEndpoint;

    @Autowired
    public TaskDocumentService(Storage storage,
                               MinioClient minioClient,
                               TaskRepository taskRepository,
                               TaskDocumentRepository taskDocumentRepository,
                               UserRepository userRepository,
                               Environment environment) {
        this.storage = storage;
        this.minioClient = minioClient;
        this.taskRepository = taskRepository;
        this.taskDocumentRepository = taskDocumentRepository;
        this.userRepository = userRepository;
        this.environment = environment;
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
            // LOCAL PROFILE: Generate MinIO S3 V4 Pre-Signed PUT URL (Docker MinIO container)
            try {
                ensureMinioBucketExists();

                String rawUrl = minioClient.getPresignedObjectUrl(
                        GetPresignedObjectUrlArgs.builder()
                                .method(Method.PUT)
                                .bucket(bucketName)
                                .object(objectPath)
                                .expiry(15, TimeUnit.MINUTES)
                                .build()
                );
                signedUrl = toPublicSignedUrl(rawUrl);
                log.info("LOCAL PROFILE: Generated MinIO S3 V4 Pre-Signed PUT URL: {}", signedUrl);
            } catch (Exception e) {
                log.error("Failed to generate MinIO S3 Pre-Signed PUT URL: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate MinIO Upload Pre-Signed URL: " + e.getMessage(), e);
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
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        User actor = resolveUser(actorId);

        // Strict RBAC Validation
        validateTaskAccess(task, actor);

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
                .build();

        TaskDocument saved = taskDocumentRepository.save(document);
        log.info("Confirmed upload for task '{}', doc ID '{}', SLA timing: {}", taskId, saved.getDocumentId(), timing);

        return mapToDto(saved);
    }

    /**
     * 3. Generate Download (GET) Signed URL (Valid for 5 minutes)
     * Prod Profile: GCS V4 GET Signed URL
     * Local Profile: MinIO S3 Pre-Signed GET URL
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
            // LOCAL PROFILE: Generate MinIO S3 V4 Pre-Signed GET URL (Docker MinIO container)
            try {
                String rawUrl = minioClient.getPresignedObjectUrl(
                        GetPresignedObjectUrlArgs.builder()
                                .method(Method.GET)
                                .bucket(bucketName)
                                .object(document.getGcsObjectPath())
                                .expiry(5, TimeUnit.MINUTES)
                                .build()
                );
                signedUrl = toPublicSignedUrl(rawUrl);
                log.info("LOCAL PROFILE: Generated MinIO S3 V4 Pre-Signed GET URL: {}", signedUrl);
            } catch (Exception e) {
                log.error("Failed to generate MinIO S3 Pre-Signed GET URL: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate MinIO Download Pre-Signed URL: " + e.getMessage(), e);
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

        if (isProdProfile()) {
            storage.delete(BlobId.of(bucketName, document.getGcsObjectPath()));
        } else {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucketName)
                                .object(document.getGcsObjectPath())
                                .build()
                );
            } catch (Exception e) {
                log.warn("Could not delete MinIO object '{}': {}", document.getGcsObjectPath(), e.getMessage());
            }
        }

        taskDocumentRepository.delete(document);
        log.info("Deleted document ID {} from task ID {}", documentId, taskId);
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

        if ("APPROVE".equalsIgnoreCase(action)) {
            document.setStatus(com.cloudkaptan.sop.domain.enums.DocumentStatus.APPROVED);
            document.setRejectionReason(null);
        } else if ("REJECT".equalsIgnoreCase(action)) {
            if (comment == null || comment.trim().isEmpty()) {
                throw new IllegalArgumentException("Mandatory rejection reason required for document rejection.");
            }
            document.setStatus(com.cloudkaptan.sop.domain.enums.DocumentStatus.REJECTED);
            document.setRejectionReason(comment);
        } else {
            throw new IllegalArgumentException("Invalid document review action: " + action + ". Allowed values: APPROVE, REJECT.");
        }

        document.setActionedById(actor.getUserId());
        document.setActionedByName(actor.getFullName());
        document.setActionedAt(OffsetDateTime.now());

        TaskDocument saved = taskDocumentRepository.save(document);
        log.info("Document ID {} on task ID {} was {} by actor '{}'", documentId, taskId, action, actorId);
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
                .status(document.getStatus() != null ? document.getStatus() : com.cloudkaptan.sop.domain.enums.DocumentStatus.PENDING_REVIEW)
                .rejectionReason(document.getRejectionReason())
                .actionedById(document.getActionedById())
                .actionedByName(document.getActionedByName())
                .actionedAt(document.getActionedAt())
                .build();
    }

    private void ensureMinioBucketExists() {
        try {
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );
            if (!bucketExists) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(bucketName).build()
                );
                log.info("Created missing MinIO S3 bucket '{}'", bucketName);
            }

            // Set public read-write policy on MinIO bucket so local browser PUT requests are never blocked by 403
            String policyJson = String.format("{\n" +
                    "  \"Version\": \"2012-10-17\",\n" +
                    "  \"Statement\": [\n" +
                    "    {\n" +
                    "      \"Effect\": \"Allow\",\n" +
                    "      \"Principal\": \"*\",\n" +
                    "      \"Action\": [\"s3:GetObject\", \"s3:PutObject\", \"s3:DeleteObject\"],\n" +
                    "      \"Resource\": [\"arn:aws:s3:::%s/*\"]\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}", bucketName);

            minioClient.setBucketPolicy(
                    SetBucketPolicyArgs.builder()
                            .bucket(bucketName)
                            .config(policyJson)
                            .build()
            );
        } catch (Exception e) {
            log.warn("MinIO bucket policy setup warning: {}", e.getMessage());
        }
    }

    private String toPublicSignedUrl(String rawUrl) {
        if (rawUrl == null) return null;
        if (minioPublicEndpoint == null || minioPublicEndpoint.trim().isEmpty()) {
            return rawUrl;
        }

        String internalBase = cleanUrl(minioEndpoint);
        String publicBase = cleanUrl(minioPublicEndpoint);

        if (!internalBase.isEmpty() && !publicBase.isEmpty() && !internalBase.equalsIgnoreCase(publicBase)) {
            return rawUrl.replace(internalBase, publicBase);
        }
        return rawUrl;
    }

    private String cleanUrl(String url) {
        if (url == null) return "";
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}

package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.TenantContext;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.TaskDocumentDto;
import com.cloudkaptan.sop.entity.ProcessCategory;
import com.cloudkaptan.sop.domain.enums.UploadTiming;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.TaskDocument;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.TaskDocumentRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TaskDocumentService {

    private static final Logger log = LoggerFactory.getLogger(TaskDocumentService.class);

    private final TaskDocumentRepository taskDocumentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    public TaskDocumentService(TaskDocumentRepository taskDocumentRepository,
                               TaskRepository taskRepository,
                               UserRepository userRepository,
                               StorageService storageService) {
        this.taskDocumentRepository = taskDocumentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    @Transactional
    public TaskDocumentDto uploadTaskDocument(UUID taskId, MultipartFile file, String actorId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        User actor = resolveUser(actorId);

        // RBAC check for upload includes Manager hierarchy check
        if (!canUserUploadDocument(task, actor)) {
            throw new IllegalStateException("User " + actor.getUserId() + " is not authorized to upload documents for this task.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            originalFilename = "unnamed_document";
        }
        originalFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");

        // Construct Hierarchical GCS Path
        Sop sop = task.getSop();
        String categoryCode = sop.getProcessCategory() != null ? sop.getProcessCategory() : "UNKNOWN_CAT";
        String sopCode = sop.getSopCode() != null ? sop.getSopCode() : "UNKNOWN_SOP";
        String taskRecordNo = task.getRecordNo() != null ? task.getRecordNo() : taskId.toString();
        
        // Extract Year from periodKey (e.g., 2026-Q3 -> 2026)
        String year = "UNKNOWN_YEAR";
        if (task.getPeriodKey() != null && task.getPeriodKey().length() >= 4) {
            year = task.getPeriodKey().substring(0, 4);
        }

        // e.g., 2026/TREASURY/TAX-RECON-001/TAX-RECON-001-2026-09/uuid_filename.pdf
        String objectPath = String.format("%s/%s/%s/%s/%s_%s", 
                year, categoryCode, sopCode, taskRecordNo, UUID.randomUUID(), originalFilename);

        try (InputStream is = file.getInputStream()) {
            storageService.uploadFile(objectPath, is, file.getContentType(), file.getSize());
        } catch (Exception e) {
            log.error("Failed to stream file to storage: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload document stream: " + e.getMessage(), e);
        }

        // Evaluate Document Due Date SLA
        UploadTiming timing = UploadTiming.ON_TIME;
        if (task.getDueDate() != null) {
            LocalDate today = OffsetDateTime.now().atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
            if (today.isAfter(task.getDueDate())) {
                timing = UploadTiming.LATE;
            }
        }

        TaskDocument document = TaskDocument.builder()
                .task(task)
                .fileName(originalFilename)
                .gcsObjectPath(objectPath)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .uploadedBy(actor)
                .uploadTiming(timing)
                .build();

        TaskDocument saved = taskDocumentRepository.save(document);
        log.info("Successfully uploaded document '{}' (ID: {}) for task ID {}", originalFilename, saved.getDocumentId(), taskId);

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<TaskDocumentDto> getTaskDocuments(UUID taskId) {
        return taskDocumentRepository.findByTaskTaskIdOrderByUploadedAtDesc(taskId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InputStream downloadTaskDocumentStream(UUID taskId, UUID documentId, String actorId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        User actor = resolveUser(actorId);

        // RBAC check for download: any participant, admin, or authorized manager
        if (!canUserAccessTask(task, actor)) {
            throw new IllegalStateException("User " + actor.getUserId() + " is not authorized to access documents for this task.");
        }

        TaskDocument document = taskDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        if (!document.getTask().getTaskId().equals(taskId)) {
            throw new IllegalArgumentException("Document ID " + documentId + " does not belong to task ID " + taskId);
        }

        return storageService.downloadFileStream(document.getGcsObjectPath());
    }

    @Transactional(readOnly = true)
    public TaskDocument getTaskDocument(UUID taskId, UUID documentId) {
        TaskDocument document = taskDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        if (!document.getTask().getTaskId().equals(taskId)) {
            throw new IllegalArgumentException("Document ID " + documentId + " does not belong to task ID " + taskId);
        }
        return document;
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

        boolean isAdmin = actor.getRole() == UserRole.ADMIN;
        boolean isUploader = document.getUploadedBy().getUserId().equalsIgnoreCase(actor.getUserId());

        if (!isAdmin && !isUploader) {
            throw new IllegalStateException("Only the document uploader or an Admin can delete this document.");
        }

        storageService.deleteFile(document.getGcsObjectPath());
        taskDocumentRepository.delete(document);
        log.info("Deleted document ID {} from task ID {}", documentId, taskId);
    }

    private boolean canUserUploadDocument(Task task, User actor) {
        return canUserAccessTask(task, actor);
    }

    private boolean canUserAccessTask(Task task, User actor) {
        if (actor.getRole() == UserRole.ADMIN) {
            return true;
        }

        String userId = actor.getUserId();
        String email = actor.getEmail() != null ? actor.getEmail().toLowerCase() : "";

        // Combine actor's own ID with their manager subordinates
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

        // Check assigned makers/checkers or single maker/checker
        if (task.getMaker() != null && matchesAnyUser(task.getMaker(), authorizedIds)) return true;
        if (task.getChecker() != null && matchesAnyUser(task.getChecker(), authorizedIds)) return true;

        if (containsAnyMatch(task.getAssignedMakerIds(), authorizedIds)) return true;
        if (containsAnyMatch(task.getAssignedCheckerIds(), authorizedIds)) return true;

        // Check SOP creators and approvers
        Sop sop = task.getSop();
        if (sop != null) {
            if (sop.getCreatedBy() != null && matchesAnyUser(sop.getCreatedBy(), authorizedIds)) return true;
            if (containsAnyMatch(sop.getAssignedCreatorIds(), authorizedIds)) return true;
            if (containsAnyMatch(sop.getAssignedApproverIds(), authorizedIds)) return true;
            if (sop.getAssignedCreatorId() != null && authorizedIds.contains(sop.getAssignedCreatorId())) return true;
            if (sop.getAssignedApproverId() != null && authorizedIds.contains(sop.getAssignedApproverId())) return true;
        }

        return false;
    }

    private boolean matchesAnyUser(User target, List<String> authorizedIds) {
        if (target == null) return false;
        if (authorizedIds.contains(target.getUserId())) return true;
        return target.getEmail() != null && authorizedIds.contains(target.getEmail().toLowerCase());
    }

    private boolean containsAnyMatch(List<String> list, List<String> authorizedIds) {
        if (list == null || list.isEmpty()) return false;
        return !Collections.disjoint(list, authorizedIds);
    }

    private User resolveUser(String actorId) {
        if (actorId == null || actorId.trim().isEmpty()) {
            throw new IllegalArgumentException("Actor ID is required for task document operations.");
        }
        return userRepository.findById(actorId)
                .orElseGet(() -> userRepository.findByEmail(actorId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found for ID/email: " + actorId)));
    }

    public TaskDocumentDto mapToDto(TaskDocument document) {
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
                .build();
    }
}

package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.cloudkaptan.sop.domain.enums.UploadTiming;
import com.cloudkaptan.sop.domain.enums.DocumentStatus;

@Entity
@Table(name = "task_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "document_id", nullable = false, updatable = false)
    private UUID documentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false, updatable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "required_document_id", nullable = false)
    private RequiredDocument requiredDocument;

    @Column(name = "file_name", length = 255, nullable = false)
    private String fileName;

    @Column(name = "gcs_object_path", length = 512, nullable = false)
    private String gcsObjectPath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "content_type", length = 128)
    private String contentType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by_id", nullable = false, updatable = false)
    private User uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;

    // New field for SLA tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "upload_timing", length = 32)
    private UploadTiming uploadTiming;

    // Per-document review fields
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private DocumentStatus status = DocumentStatus.PENDING_REVIEW;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "actioned_by_id", length = 64)
    private String actionedById;

    @Column(name = "actioned_by_name", length = 255)
    private String actionedByName;

    @Column(name = "actioned_at")
    private OffsetDateTime actionedAt;

    @Builder.Default
    @org.hibernate.annotations.ColumnDefault("false")
    @Column(name = "is_resubmission", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isResubmission = false;

    @Column(name = "replaced_document_id")
    private UUID replacedDocumentId;

    public Boolean getIsResubmission() {
        return Boolean.TRUE.equals(this.isResubmission);
    }
}
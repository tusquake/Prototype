package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;
import com.cloudkaptan.sop.domain.enums.DocumentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDocumentDto {
    private UUID documentId;
    private UUID taskId;
    private String fileName;
    private String gcsObjectPath;
    private Long fileSize;
    private String contentType;
    private String uploadedById;
    private String uploadedByName;
    private OffsetDateTime uploadedAt;
    private DocumentStatus status;
    private String rejectionReason;
    private String actionedById;
    private String actionedByName;
    private OffsetDateTime actionedAt;
    private Boolean isResubmission;
    private UUID replacedDocumentId;
}

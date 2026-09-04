package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

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
}

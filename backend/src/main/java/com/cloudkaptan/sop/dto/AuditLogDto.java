package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {
    private Long auditId;
    private String actorId;
    private String actorName;
    private String actorEmail;
    private String action;
    private String entityType;
    private String entityId;
    private String correlationId;
    private OffsetDateTime timestamp;
}

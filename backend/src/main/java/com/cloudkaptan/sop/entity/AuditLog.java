package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_logs")
@Immutable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id", nullable = false, updatable = false)
    private Long auditId;

    @Column(name = "actor_id", length = 64, nullable = false, updatable = false)
    private String actorId;

    @Column(name = "action", length = 64, nullable = false, updatable = false)
    private String action;

    @Column(name = "entity_type", length = 64, nullable = false, updatable = false)
    private String entityType;

    @Column(name = "entity_id", length = 64, nullable = false, updatable = false)
    private String entityId;

    @Column(name = "correlation_id", length = 64, updatable = false)
    private String correlationId;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private OffsetDateTime timestamp;
}

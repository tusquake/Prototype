package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "access_control_activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessControlActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "process_category", length = 64, nullable = false)
    private String processCategory;

    @Column(name = "action", length = 64, nullable = false)
    private String action;

    @Column(name = "actor_id", length = 64, nullable = false)
    private String actorId;

    @Column(name = "actor_name", length = 128)
    private String actorName;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private OffsetDateTime timestamp;
}

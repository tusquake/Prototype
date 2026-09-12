package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "task_outbox")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "outbox_id", nullable = false, updatable = false)
    private UUID outboxId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sop_version_id", nullable = false)
    private SopVersion sopVersion;

    @Column(name = "period_key", length = 20, nullable = false)
    private String periodKey;

    @Column(name = "schedule_time", nullable = false)
    private OffsetDateTime scheduleTime;

    @Column(name = "kind", length = 20, nullable = false)
    @Builder.Default
    private String kind = "TASK"; // 'TASK' or 'CHECKPOINT'

    @Column(name = "target_time")
    private OffsetDateTime targetTime;

    @Column(name = "dispatched_at")
    private OffsetDateTime dispatchedAt;

    @Column(name = "dispatch_attempts", nullable = false)
    @Builder.Default
    private Integer dispatchAttempts = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

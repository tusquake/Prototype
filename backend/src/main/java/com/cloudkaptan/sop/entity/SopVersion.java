package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "sop_versions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_sop_version_number", columnNames = {"sop_id", "version_number"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SopVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "version_id", nullable = false, updatable = false)
    private UUID versionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sop_id", nullable = false)
    private Sop sop;

    @Column(name = "version_number", length = 20, nullable = false)
    @Builder.Default
    private String versionNumber = "1.0";

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", length = 32, nullable = false)
    private SopFrequency frequency;

    @Column(name = "start_date_time", nullable = false)
    private OffsetDateTime startDateTime;

    @Column(name = "due_date_time", nullable = false)
    private OffsetDateTime dueDateTime;

    @Column(name = "is_recurring", nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(name = "version_status", length = 30, nullable = false)
    @Builder.Default
    private String versionStatus = "APPROVED"; // DRAFT, PENDING_APPROVAL, APPROVED, ARCHIVED

    @Column(name = "is_running", nullable = false)
    @Builder.Default
    private Boolean isRunning = true;

    @Column(name = "next_expected_execution_at")
    private OffsetDateTime nextExpectedExecutionAt;

    @Column(name = "next_cloud_task_name", length = 255)
    private String nextCloudTaskName;

    @Column(name = "created_by", length = 64)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

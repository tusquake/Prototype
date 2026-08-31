package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "tasks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_sop_period", columnNames = {"sop_id", "period_key"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "task_id", nullable = false, updatable = false)
    private UUID taskId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "record_no", length = 64, nullable = false, unique = true)
    private String recordNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sop_id", nullable = false)
    private Sop sop;

    @Column(name = "period_key", length = 32, nullable = false)
    private String periodKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_code", nullable = false)
    private CorporateEntity entity;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "maker_id", nullable = true)
    private User maker;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "checker_id", nullable = true)
    private User checker;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_maker_pool", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "maker_id", length = 64)
    @Builder.Default
    private java.util.List<String> assignedMakerIds = new java.util.ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_checker_pool", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "checker_id", length = 64)
    @Builder.Default
    private java.util.List<String> assignedCheckerIds = new java.util.ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private TaskStatus status;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

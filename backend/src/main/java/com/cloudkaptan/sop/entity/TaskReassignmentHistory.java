package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "task_reassignment_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskReassignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "history_id", nullable = false, updatable = false)
    private UUID historyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "previous_maker_ids", columnDefinition = "TEXT")
    private String previousMakerIds;

    @Column(name = "previous_maker_names", columnDefinition = "TEXT")
    private String previousMakerNames;

    @Column(name = "new_maker_ids", columnDefinition = "TEXT")
    private String newMakerIds;

    @Column(name = "new_maker_names", columnDefinition = "TEXT")
    private String newMakerNames;

    @Column(name = "previous_checker_ids", columnDefinition = "TEXT")
    private String previousCheckerIds;

    @Column(name = "previous_checker_names", columnDefinition = "TEXT")
    private String previousCheckerNames;

    @Column(name = "new_checker_ids", columnDefinition = "TEXT")
    private String newCheckerIds;

    @Column(name = "new_checker_names", columnDefinition = "TEXT")
    private String newCheckerNames;

    @Column(name = "reassigned_by", length = 64, nullable = false)
    private String reassignedBy;

    @Column(name = "reassigned_by_name", length = 128)
    private String reassignedByName;

    @Column(name = "worked_until", nullable = false)
    private OffsetDateTime workedUntil;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

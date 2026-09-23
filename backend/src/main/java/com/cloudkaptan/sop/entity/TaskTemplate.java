package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A single step/task blueprint within an SopTemplate.
 * Stores ETA days (relative to the SOP instance start date) instead of fixed calendar dates,
 * so templates remain reusable across recurring SOP runs regardless of calendar year.
 *
 * User-facing labels:
 *   etaStartDay → "Target Start: Day N from SOP start"
 *   etaEndDay   → "Completion Deadline: By Day N from SOP start"
 */
@Entity
@Table(
    name = "task_templates",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_task_template_step", columnNames = {"template_id", "step_sequence"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "task_template_id", nullable = false, updatable = false)
    private UUID taskTemplateId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private SopTemplate sopTemplate;

    @Column(name = "step_sequence", nullable = false)
    private Integer stepSequence;

    @Column(name = "task_name", length = 255, nullable = false)
    private String taskName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * INDEPENDENT or DEPENDENT_ON_PREVIOUS.
     * The first task in a template is always INDEPENDENT.
     */
    @Column(name = "dependency_mode", length = 64, nullable = false)
    @Builder.Default
    private String dependencyMode = "INDEPENDENT";

    @Column(name = "priority", length = 32, nullable = false)
    @Builder.Default
    private String priority = "Medium";

    /**
     * Day N from the SOP instance's targetStartDate when this task should start.
     * User sees: "Target Start: Day [etaStartDay] from SOP start"
     * Example: etaStartDay=0 → task starts on the same day as the SOP instance.
     */
    @Column(name = "eta_start_day", nullable = false)
    @Builder.Default
    private Integer etaStartDay = 0;

    /**
     * Day N from the SOP instance's targetStartDate by which this task must be completed.
     * User sees: "Completion Deadline: By Day [etaEndDay] from SOP start"
     * Example: etaEndDay=7 → task must be done within 7 days of SOP start.
     */
    @Column(name = "eta_end_day", nullable = false)
    @Builder.Default
    private Integer etaEndDay = 7;

    @Column(name = "sla_hours", nullable = false)
    @Builder.Default
    private Integer slaHours = 24;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_template_maker_pool", joinColumns = @JoinColumn(name = "task_template_id"))
    @Column(name = "maker_id", length = 64)
    @Builder.Default
    private List<String> makerIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_template_checker_pool", joinColumns = @JoinColumn(name = "task_template_id"))
    @Column(name = "checker_id", length = 64)
    @Builder.Default
    private List<String> checkerIds = new ArrayList<>();

@OneToMany(
    mappedBy = "taskTemplate",
    cascade = CascadeType.ALL,
    orphanRemoval = true
)
@Builder.Default
private List<RequiredDocument> requiredDocuments = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

 
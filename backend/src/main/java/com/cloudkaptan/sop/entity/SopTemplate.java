package com.cloudkaptan.sop.entity;
 
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
 
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
 
/**
* Blueprint/template for an SOP. Not a real execution record.
* The scheduler reads ACTIVE templates and spawns real Sop + Task instances from them.
*/
@Entity
@Table(name = "sop_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SopTemplate {
 
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "template_id", nullable = false, updatable = false)
    private UUID templateId;
 
    @Column(name = "template_code", length = 64, nullable = false, unique = true)
    private String templateCode;
 
    @Column(name = "title", length = 255, nullable = false)
    private String title;
 
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
 
    @Column(name = "process_category", length = 128, nullable = false)
    private String processCategory;
 
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_code", nullable = false)
    private CorporateEntity entity;
 
    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", length = 32, nullable = false)
    private SopFrequency frequency;
 
    @Column(name = "is_recurring", nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;
 
    /**
     * JSON-serialized recurrence config.
     * Weekly  → {"weekdays":["MON","WED","FRI"]}
     * Monthly → {"dayOfMonth":15}
     * Quarterly → {"months":["JAN","APR","JUL","OCT"],"dayOfMonth":1}
     * Annual  → {"monthOfYear":"MAR","dayOfMonth":31}
     */
    @Column(name = "recurrence_config", columnDefinition = "TEXT")
    private String recurrenceConfig;
 
    @Column(name = "due_day_offset", nullable = false)
    @Builder.Default
    private Integer dueDayOffset = 0;
 
    /**
     * When the scheduler starts generating SOP instances from this template.
     */
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;
 
    /**
     * When the template retires — null means indefinite.
     */
    @Column(name = "effective_until")
    private LocalDate effectiveUntil;
 
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private SopTemplateStatus status = SopTemplateStatus.DRAFT;
 
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sop_template_maker_pool", joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "maker_id", length = 64)
    @Builder.Default
    private List<String> defaultMakerIds = new ArrayList<>();
 
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sop_template_checker_pool", joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "checker_id", length = 64)
    @Builder.Default
    private List<String> defaultCheckerIds = new ArrayList<>();
 
    @OneToMany(mappedBy = "sopTemplate", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stepSequence ASC")
    @Builder.Default
    private List<TaskTemplate> taskTemplates = new ArrayList<>();
 
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
 
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
 
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
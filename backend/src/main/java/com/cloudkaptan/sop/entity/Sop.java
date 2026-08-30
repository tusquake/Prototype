package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "sop_id", nullable = false, updatable = false)
    private UUID sopId;

    @Column(name = "sop_code", length = 64, nullable = false, unique = true)
    private String sopCode;

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

    @Column(name = "due_day_offset", nullable = false)
    private Integer dueDayOffset;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "default_maker_id", nullable = false)
    private User defaultMaker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "default_checker_id", nullable = false)
    private User defaultChecker;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private SopStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "version")
    @Builder.Default
    private Integer version = 1;
}

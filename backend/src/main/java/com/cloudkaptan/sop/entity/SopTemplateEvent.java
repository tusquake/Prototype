package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Table(name = "sop_template_events")
@Immutable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SopTemplateEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false, updatable = false)
    private SopTemplate sopTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", updatable = false)
    private User actor;

    @Column(name = "action", length = 64, nullable = false, updatable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 32, updatable = false)
    private SopTemplateStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 32, updatable = false)
    private SopTemplateStatus toStatus;

    @Column(name = "comment", length = 512, updatable = false)
    private String comment;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private OffsetDateTime timestamp;
}

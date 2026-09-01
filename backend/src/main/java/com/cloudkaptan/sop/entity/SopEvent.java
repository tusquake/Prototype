package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Table(name = "sop_events")
@Immutable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SopEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sop_id", nullable = false, updatable = false)
    private Sop sop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", updatable = false)
    private User actor;

    @Column(name = "action", length = 64, nullable = false, updatable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 32, updatable = false)
    private SopStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 32, nullable = false, updatable = false)
    private SopStatus toStatus;

    @Column(name = "comment", length = 512, updatable = false)
    private String comment;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private OffsetDateTime timestamp;
}

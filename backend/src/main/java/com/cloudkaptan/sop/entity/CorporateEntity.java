package com.cloudkaptan.sop.entity;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "entities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateEntity {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "entity_code", length = 32, nullable = false)
    private EntityCode entityCode;

    @Column(name = "entity_name", length = 128, nullable = false)
    private String entityName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

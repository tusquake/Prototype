package com.cloudkaptan.sop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "user_sop_category_permissions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_category", columnNames = {"user_id", "process_category"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCategoryPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "process_category", length = 64, nullable = false)
    private String processCategory;

    @Builder.Default
    @Column(name = "can_create_sop", nullable = false)
    private Boolean canCreateSop = false;

    @Builder.Default
    @Column(name = "can_approve_sop", nullable = false)
    private Boolean canApproveSop = false;

    @Builder.Default
    @Column(name = "can_make_task", nullable = false)
    private Boolean canMakeTask = false;

    @Builder.Default
    @Column(name = "can_check_task", nullable = false)
    private Boolean canCheckTask = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

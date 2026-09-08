package com.cloudkaptan.sop.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "user_hierarchy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserHierarchy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "hierarchy_id", updatable = false, nullable = false)
    private UUID hierarchyId;

    @Column(name = "manager_id", nullable = false, length = 64)
    private String managerId;

    @Column(name = "subordinate_id", nullable = false, length = 64)
    private String subordinateId;

    @Column(name = "can_read_tasks", nullable = false)
    private boolean canReadTasks;

    @Column(name = "can_write_tasks", nullable = false)
    private boolean canWriteTasks;
}
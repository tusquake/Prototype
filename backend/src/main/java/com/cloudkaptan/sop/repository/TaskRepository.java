package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.repository.projection.TaskInboxView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    boolean existsBySop_SopIdAndPeriodKey(UUID sopId, String periodKey);

    boolean existsBySop_SopId(UUID sopId);

    Optional<Task> findByRecordNo(String recordNo);

    @Query("""
        SELECT DISTINCT
            t.taskId as taskId,
            t.recordNo as recordNo,
            s.title as sopTitle,
            s.sopCode as sopCode,
            s.processCategory as processCategory,
            t.entity.entityCode as entityCode,
            t.periodKey as periodKey,
            m.userId as makerId,
            m.fullName as makerName,
            c.userId as checkerId,
            c.fullName as checkerName,
            t.status as status,
            t.dueDate as dueDate,
            t.completedAt as completedAt,
            t.approvedAt as approvedAt
        FROM Task t
        JOIN t.sop s
        LEFT JOIN t.maker m
        LEFT JOIN t.checker c
        LEFT JOIN t.assignedMakerIds am
        LEFT JOIN t.assignedCheckerIds ac
        LEFT JOIN s.assignedCreatorIds sc
        LEFT JOIN s.assignedApproverIds sa
        LEFT JOIN s.createdBy cb
        WHERE (:entities IS NULL OR t.entity.entityCode IN :entities)
          AND (:status IS NULL OR t.status = :status)
          AND (:userId IS NULL 
               OR t.maker.userId = :userId 
               OR t.checker.userId = :userId 
               OR am = :userId 
               OR ac = :userId 
               OR s.assignedCreatorId = :userId 
               OR sc = :userId 
               OR s.assignedApproverId = :userId 
               OR sa = :userId 
               OR cb.userId = :userId)
        ORDER BY t.dueDate ASC
    """)
    Page<TaskInboxView> findInboxTasks(
        @Param("entities") List<EntityCode> entities,
        @Param("status") TaskStatus status,
        @Param("userId") String userId,
        Pageable pageable
    );

    @Query("""
        SELECT t FROM Task t
        WHERE (:entities IS NULL OR t.entity.entityCode IN :entities)
        ORDER BY t.createdAt DESC
    """)
    List<Task> findTasksByEntities(@Param("entities") List<EntityCode> entities);

    long countByStatusAndEntity_EntityCodeIn(TaskStatus status, List<EntityCode> entities);

    long countByEntity_EntityCodeIn(List<EntityCode> entities);
}

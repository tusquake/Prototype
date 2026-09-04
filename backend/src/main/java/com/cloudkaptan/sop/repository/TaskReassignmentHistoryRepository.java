package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskReassignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskReassignmentHistoryRepository extends JpaRepository<TaskReassignmentHistory, UUID> {
    List<TaskReassignmentHistory> findByTask_TaskIdOrderByWorkedUntilDesc(UUID taskId);
}

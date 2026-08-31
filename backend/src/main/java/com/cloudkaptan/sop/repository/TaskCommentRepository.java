package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {
    List<TaskComment> findByTask_TaskIdOrderByCreatedAtAsc(UUID taskId);
}

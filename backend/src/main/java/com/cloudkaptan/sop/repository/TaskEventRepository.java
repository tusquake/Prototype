package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskEventRepository extends JpaRepository<TaskEvent, Long> {

    List<TaskEvent> findByTask_TaskIdOrderByTimestampAsc(UUID taskId);
}

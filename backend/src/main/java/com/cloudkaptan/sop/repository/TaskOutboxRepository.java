package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface TaskOutboxRepository extends JpaRepository<TaskOutbox, UUID> {

    @Query("SELECT o FROM TaskOutbox o WHERE o.dispatchedAt IS NULL ORDER BY o.createdAt ASC")
    List<TaskOutbox> findPendingOutboxRows();
}

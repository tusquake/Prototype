package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskDocumentRepository extends JpaRepository<TaskDocument, UUID> {

    List<TaskDocument> findByTaskTaskIdOrderByUploadedAtDesc(UUID taskId);

    long countByTaskTaskId(UUID taskId);
}

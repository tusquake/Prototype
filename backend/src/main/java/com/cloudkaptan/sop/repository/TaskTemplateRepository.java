package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.TaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskTemplateRepository extends JpaRepository<TaskTemplate, UUID> {

    List<TaskTemplate> findBySopTemplate_TemplateIdOrderByStepSequenceAsc(UUID templateId);

    void deleteBySopTemplate_TemplateId(UUID templateId);

    int countBySopTemplate_TemplateId(UUID templateId);
}

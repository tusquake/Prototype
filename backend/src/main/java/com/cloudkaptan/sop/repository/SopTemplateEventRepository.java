package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.SopTemplateEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SopTemplateEventRepository extends JpaRepository<SopTemplateEvent, Long> {

    List<SopTemplateEvent> findBySopTemplate_TemplateIdOrderByTimestampDesc(UUID templateId);

    Page<SopTemplateEvent> findBySopTemplate_TemplateIdOrderByTimestampDesc(UUID templateId, Pageable pageable);
}

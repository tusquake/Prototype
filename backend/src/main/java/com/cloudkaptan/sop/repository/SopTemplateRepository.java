package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.entity.SopTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SopTemplateRepository extends JpaRepository<SopTemplate, UUID> {

    Optional<SopTemplate> findByTemplateCode(String templateCode);

    boolean existsByTemplateCode(String templateCode);

    List<SopTemplate> findByStatusOrderByCreatedAtDesc(SopTemplateStatus status);

    Page<SopTemplate> findByStatusOrderByCreatedAtDesc(SopTemplateStatus status, Pageable pageable);

    /**
     * Finds all ACTIVE templates whose effective window covers today.
     * Used by the scheduler to determine which templates should generate SOP instances.
     *
     * @param status        expected to be SopTemplateStatus.ACTIVE
     * @param today         today's date
     */
    @Query("""
            SELECT t FROM SopTemplate t
            WHERE t.status = :status
              AND t.effectiveFrom <= :today
              AND (t.effectiveUntil IS NULL OR t.effectiveUntil >= :today)
            """)
    List<SopTemplate> findSchedulableTemplates(
            @Param("status") SopTemplateStatus status,
            @Param("today") LocalDate today
    );

    List<SopTemplate> findByProcessCategoryOrderByCreatedAtDesc(String processCategory);
}

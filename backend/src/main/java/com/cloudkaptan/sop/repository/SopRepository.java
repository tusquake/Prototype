package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.entity.Sop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SopRepository extends JpaRepository<Sop, UUID> {

    Optional<Sop> findBySopCode(String sopCode);

    List<Sop> findByStatus(SopStatus status);

    @Query("SELECT s FROM Sop s WHERE s.status = :status AND (:entities IS NULL OR s.entity.entityCode IN :entities)")
    List<Sop> findByStatusAndEntityIn(@Param("status") SopStatus status, @Param("entities") List<EntityCode> entities);

    @Query("SELECT s FROM Sop s WHERE (:entities IS NULL OR s.entity.entityCode IN :entities)")
    List<Sop> findByEntityIn(@Param("entities") List<EntityCode> entities);
}

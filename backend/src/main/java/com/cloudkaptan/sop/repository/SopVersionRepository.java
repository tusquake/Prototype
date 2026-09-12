package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.SopVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SopVersionRepository extends JpaRepository<SopVersion, UUID> {

    @Query("SELECT v FROM SopVersion v WHERE v.sop.sopId = :sopId AND v.isRunning = true AND v.versionStatus = 'APPROVED'")
    Optional<SopVersion> findActiveVersionBySopId(@Param("sopId") UUID sopId);

    @Query("SELECT v FROM SopVersion v WHERE v.sop.sopId = :sopId ORDER BY v.createdAt DESC")
    List<SopVersion> findVersionHistoryBySopId(@Param("sopId") UUID sopId);

    @Query("SELECT v FROM SopVersion v WHERE v.isRunning = true AND v.versionStatus = 'APPROVED'")
    List<SopVersion> findActiveRunningVersions();

    @Query("SELECT v FROM SopVersion v WHERE v.isRunning = true AND v.versionStatus = 'APPROVED' AND v.nextExpectedExecutionAt IS NOT NULL AND v.nextExpectedExecutionAt < :graceCutoff")
    List<SopVersion> findBrokenChains(@Param("graceCutoff") OffsetDateTime graceCutoff);
}

package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.ProcessCategoryActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProcessCategoryActivityLogRepository extends JpaRepository<ProcessCategoryActivityLog, UUID> {

    List<ProcessCategoryActivityLog> findByCategoryCodeOrderByTimestampDesc(String categoryCode);
}

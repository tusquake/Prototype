package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.AccessControlActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AccessControlActivityLogRepository extends JpaRepository<AccessControlActivityLog, UUID> {
    List<AccessControlActivityLog> findByProcessCategoryOrderByTimestampDesc(String processCategory);
    List<AccessControlActivityLog> findAllByOrderByTimestampDesc();
}

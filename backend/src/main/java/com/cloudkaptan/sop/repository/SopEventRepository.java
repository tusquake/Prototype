package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.SopEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SopEventRepository extends JpaRepository<SopEvent, Long> {
    List<SopEvent> findBySop_SopIdOrderByTimestampAsc(UUID sopId);
    List<SopEvent> findBySop_SopCodeOrderByTimestampAsc(String sopCode);
}

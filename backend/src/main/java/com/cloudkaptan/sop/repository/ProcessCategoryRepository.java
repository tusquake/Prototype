package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.ProcessCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProcessCategoryRepository extends JpaRepository<ProcessCategory, UUID> {

    Optional<ProcessCategory> findByCategoryCode(String categoryCode);

    boolean existsByCategoryCode(String categoryCode);

    void deleteByCategoryCode(String categoryCode);
}

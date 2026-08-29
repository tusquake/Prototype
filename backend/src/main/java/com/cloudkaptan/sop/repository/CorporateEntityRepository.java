package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.entity.CorporateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CorporateEntityRepository extends JpaRepository<CorporateEntity, EntityCode> {
}

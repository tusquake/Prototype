package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.UserCategoryPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserCategoryPermissionRepository extends JpaRepository<UserCategoryPermission, UUID> {

    List<UserCategoryPermission> findByUserId(String userId);

    List<UserCategoryPermission> findByProcessCategory(String processCategory);

    Optional<UserCategoryPermission> findByUserIdAndProcessCategory(String userId, String processCategory);

    void deleteByUserIdAndProcessCategory(String userId, String processCategory);
}

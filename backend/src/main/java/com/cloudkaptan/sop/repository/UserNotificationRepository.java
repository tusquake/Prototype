package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotification, UUID> {

    List<UserNotification> findByRecipientUserIdAndIsDeletedFalseOrderByCreatedAtDesc(String recipientUserId);

    long countByRecipientUserIdAndIsReadFalseAndIsDeletedFalse(String recipientUserId);

    @Modifying
    @Transactional
    @Query("UPDATE UserNotification u SET u.isRead = true WHERE u.recipientUserId = :recipientUserId AND u.isRead = false AND u.isDeleted = false")
    void markAllAsReadByRecipientUserId(@Param("recipientUserId") String recipientUserId);

    @Modifying
    @Transactional
    @Query("UPDATE UserNotification u SET u.isDeleted = true WHERE u.notificationId = :id")
    void softDeleteById(@Param("id") UUID id);

    @Modifying
    @Transactional
    @Query("UPDATE UserNotification u SET u.isDeleted = true WHERE u.referenceEntityId = :referenceEntityId")
    void softDeleteByReferenceEntityId(@Param("referenceEntityId") String referenceEntityId);

    @Modifying
    @Transactional
    @Query("UPDATE UserNotification u SET u.isDeleted = true WHERE u.referenceEntityId = :referenceEntityId")
    void deleteByReferenceEntityId(@Param("referenceEntityId") String referenceEntityId);
}

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

    List<UserNotification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);

    long countByRecipientUserIdAndIsReadFalse(String recipientUserId);

    @Modifying
    @Transactional
    @Query("UPDATE UserNotification u SET u.isRead = true WHERE u.recipientUserId = :recipientUserId AND u.isRead = false")
    void markAllAsReadByRecipientUserId(@Param("recipientUserId") String recipientUserId);
}

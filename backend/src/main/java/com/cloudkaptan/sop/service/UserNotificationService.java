package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.UserNotificationDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;

    @Transactional(readOnly = true)
    public List<UserNotificationDto> getNotificationsForUser(String userId) {
        return userNotificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCountForUser(String userId) {
        return userNotificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public UserNotificationDto markAsRead(UUID notificationId) {
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        notification.setIsRead(true);
        UserNotification saved = userNotificationRepository.save(notification);
        return mapToDto(saved);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        userNotificationRepository.markAllAsReadByRecipientUserId(userId);
    }

    private UserNotificationDto mapToDto(UserNotification notification) {
        return UserNotificationDto.builder()
                .notificationId(notification.getNotificationId())
                .recipientUserId(notification.getRecipientUserId())
                .eventType(notification.getEventType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .referenceEntityType(notification.getReferenceEntityType())
                .referenceEntityId(notification.getReferenceEntityId())
                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

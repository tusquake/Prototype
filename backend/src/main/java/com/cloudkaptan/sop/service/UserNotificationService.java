package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.UserNotificationDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final Map<String, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 minutes timeout
        emittersMap.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((e) -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to FinSOP Real-Time Notification Stream"));
            log.info("Registered SSE Notification Emitter for user [{}]", userId);
        } catch (Exception e) {
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    private void removeEmitter(String userId, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(userId);
            }
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (emittersMap.isEmpty()) return;
        emittersMap.forEach((userId, list) -> {
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                }
            }
        });
    }

    public void pushSseNotification(UserNotification notification) {
        if (notification == null || notification.getRecipientUserId() == null) return;
        UserNotificationDto dto = mapToDto(notification);

        List<SseEmitter> list = emittersMap.get(notification.getRecipientUserId());
        if (list != null && !list.isEmpty()) {
            log.info("Pushing SSE Real-Time Notification to [{}] (Emitters active: {})", notification.getRecipientUserId(), list.size());
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().name("NOTIFICATION").data(dto));
                } catch (Exception e) {
                    removeEmitter(notification.getRecipientUserId(), emitter);
                }
            }
        }
    }

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

    @Transactional
    public void deleteNotification(UUID notificationId) {
        log.info("Permanently deleting UserNotification with ID [{}]", notificationId);
        userNotificationRepository.deleteById(notificationId);
    }

    @Transactional
    public void deleteByReferenceEntityId(String referenceEntityId) {
        if (referenceEntityId == null || referenceEntityId.isBlank()) return;
        log.info("Deleting all stale notifications for reference entity ID [{}]", referenceEntityId);
        userNotificationRepository.deleteByReferenceEntityId(referenceEntityId);
    }

    public UserNotificationDto mapToDto(UserNotification notification) {
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

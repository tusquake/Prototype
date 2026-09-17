package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.UserNotificationDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.HashSet;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final Map<String, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(1800000L);
        emittersMap.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((e) -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to FinSOP Real-Time Notification Stream", MediaType.TEXT_PLAIN));
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

    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (emittersMap.isEmpty()) return;
        new HashSet<>(emittersMap.entrySet()).forEach(entry -> {
            String userId = entry.getKey();
            List<SseEmitter> list = entry.getValue();
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
            log.info("Pushing SSE Real-Time Notification to [{}]", notification.getRecipientUserId());
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().name("NOTIFICATION").data(dto, MediaType.APPLICATION_JSON));
                } catch (Exception e) {
                    removeEmitter(notification.getRecipientUserId(), emitter);
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<UserNotificationDto> getNotificationsForUser(String userId) {
        return userNotificationRepository.findByRecipientUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserNotificationDto> getNotificationsForUser(String userId, Pageable pageable) {
        return userNotificationRepository.findByRecipientUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public long getUnreadCountForUser(String userId) {
        return userNotificationRepository.countByRecipientUserIdAndIsReadFalseAndIsDeletedFalse(userId);
    }

    @Transactional
    public UserNotificationDto markAsRead(UUID notificationId) {
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));
        notification.setIsRead(true);
        return mapToDto(userNotificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(String userId) {
        userNotificationRepository.markAllAsReadByRecipientUserId(userId);
    }

    @Transactional
    public void deleteNotification(UUID notificationId) {
        userNotificationRepository.softDeleteById(notificationId);
    }

    @Transactional
    public void deleteByReferenceEntityId(String referenceEntityId) {
        if (referenceEntityId == null || referenceEntityId.isBlank()) return;
        userNotificationRepository.softDeleteByReferenceEntityId(referenceEntityId);
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

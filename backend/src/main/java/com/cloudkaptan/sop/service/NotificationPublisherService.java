package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import com.cloudkaptan.sop.service.messaging.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPublisherService {

    private final ObjectProvider<NotificationEventPublisher> eventPublisherProvider;
    private final UserNotificationRepository userNotificationRepository;
    private final ObjectProvider<UserNotificationService> userNotificationServiceProvider;

    public void publishNotification(NotificationEventDto eventDto) {
        if (eventDto.getRecipientUserId() == null || eventDto.getRecipientUserId().isBlank()) {
            log.warn("NotificationPublisherService: recipientUserId is missing, skipping event {}", eventDto.getEventType());
            return;
        }

        NotificationEventPublisher publisher = eventPublisherProvider.getIfAvailable();

        if (publisher != null) {
            try {
                log.info("Delegating event publish to active messaging provider [{}] for recipient [{}]",
                        publisher.getProviderName(), eventDto.getRecipientUserId());
                publisher.publish(eventDto);
            } catch (Exception ex) {
                log.warn("Messaging provider [{}] failed ({}), executing DB fallback for notification to {}",
                        publisher.getProviderName(), ex.getMessage(), eventDto.getRecipientUserId());
                saveToDatabase(eventDto);
            }
        } else {
            log.info("No external messaging provider configured. Saving notification directly to DB.");
            saveToDatabase(eventDto);
        }
    }

    public void saveToDatabase(NotificationEventDto dto) {
        try {
            UserNotification notification = UserNotification.builder()
                    .recipientUserId(dto.getRecipientUserId())
                    .eventType(dto.getEventType() != null ? dto.getEventType() : "GENERAL")
                    .title(dto.getTitle() != null ? dto.getTitle() : "System Notification")
                    .message(dto.getMessage())
                    .referenceEntityType(dto.getReferenceEntityType())
                    .referenceEntityId(dto.getReferenceEntityId())
                    .isRead(false)
                    .build();

            UserNotification saved = userNotificationRepository.save(notification);
            log.info("Saved UserNotification to database: notificationId={}, recipient={}",
                    saved.getNotificationId(), saved.getRecipientUserId());

            // Real-Time SSE Push to connected browser clients
            UserNotificationService uns = userNotificationServiceProvider.getIfAvailable();
            if (uns != null) {
                uns.pushSseNotification(saved);
            }
        } catch (Exception e) {
            log.error("Failed to save UserNotification to database: {}", e.getMessage(), e);
        }
    }
}

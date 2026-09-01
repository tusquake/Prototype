package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.RabbitMQConfig;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPublisherService {

    private final RabbitTemplate rabbitTemplate;
    private final UserNotificationRepository userNotificationRepository;
    private final ObjectProvider<UserNotificationService> userNotificationServiceProvider;

    public void publishNotification(NotificationEventDto eventDto) {
        if (eventDto.getRecipientUserId() == null || eventDto.getRecipientUserId().isBlank()) {
            log.warn("NotificationPublisherService: recipientUserId is missing, skipping event {}", eventDto.getEventType());
            return;
        }

        String routingKey = "notification.inapp." + (eventDto.getReferenceEntityType() != null ? eventDto.getReferenceEntityType().toLowerCase() : "general");

        try {
            log.info("Publishing Notification Event to RabbitMQ: routingKey={}, recipient={}, eventType={}",
                    routingKey, eventDto.getRecipientUserId(), eventDto.getEventType());
            rabbitTemplate.convertAndSend(RabbitMQConfig.NOTIFICATION_EXCHANGE, routingKey, eventDto);
        } catch (Exception ex) {
            log.warn("RabbitMQ unavailable ({}), executing direct DB fallback for notification to {}",
                    ex.getMessage(), eventDto.getRecipientUserId());
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

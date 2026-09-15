package com.cloudkaptan.sop.service.messaging;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.entity.UserNotification;
import com.cloudkaptan.sop.repository.UserNotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.core.ApiFuture;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.messaging.provider", havingValue = "pubsub")
@RequiredArgsConstructor
public class GcpPubSubNotificationEventPublisher implements NotificationEventPublisher {

    private final ObjectMapper objectMapper;
    // Inject repository directly to avoid circular dependency with NotificationPublisherService
    private final UserNotificationRepository userNotificationRepository;

    @Value("${spring.cloud.gcp.pubsub.topic.notification:${GCP_PUBSUB_NOTIFICATION_TOPIC:finsop-notification-topic}}")
    private String notificationTopic;

    @Value("${spring.cloud.gcp.project-id:${GCP_PROJECT_ID:finance-sop-portal}}")
    private String gcpProjectId;

    // Publisher is initialized once and reused across all publish() calls for efficiency
    private Publisher publisher;

    @PostConstruct
    public void initPublisher() {
        try {
            TopicName topicName = TopicName.of(gcpProjectId, notificationTopic);
            publisher = Publisher.newBuilder(topicName).build();
            log.info("[GCP Cloud Pub/Sub] Publisher initialized for Topic [projects/{}/topics/{}]",
                    gcpProjectId, notificationTopic);
        } catch (Exception e) {
            log.error("[GCP Cloud Pub/Sub] Failed to initialize Publisher for topic [{}]: {}. " +
                    "All notifications will fall back to direct DB save.", notificationTopic, e.getMessage(), e);
        }
    }

    @Override
    public void publish(NotificationEventDto eventDto) {
        if (publisher == null) {
            log.warn("[GCP Cloud Pub/Sub] Publisher is not initialized. Falling back to DB save for recipient={}", eventDto.getRecipientUserId());
            saveFallback(eventDto);
            return;
        }

        try {
            String jsonPayload = objectMapper.writeValueAsString(eventDto);
            log.info("[GCP Cloud Pub/Sub] Publishing notification event to Topic [{}]: recipient={}, eventType={}",
                    notificationTopic, eventDto.getRecipientUserId(), eventDto.getEventType());

            ByteString data = ByteString.copyFromUtf8(jsonPayload);
            PubsubMessage pubsubMessage = PubsubMessage.newBuilder()
                    .setData(data)
                    .putAttributes("recipientUserId", eventDto.getRecipientUserId() != null ? eventDto.getRecipientUserId() : "")
                    .putAttributes("eventType", eventDto.getEventType() != null ? eventDto.getEventType() : "")
                    .build();

            ApiFuture<String> messageIdFuture = publisher.publish(pubsubMessage);
            String messageId = messageIdFuture.get(10, TimeUnit.SECONDS);
            log.info("[GCP Cloud Pub/Sub] Successfully published messageId={} to Topic [{}]", messageId, notificationTopic);
        } catch (Exception e) {
            log.error("[GCP Cloud Pub/Sub] Failed to publish message to topic [{}]: {}. Falling back to DB save.",
                    notificationTopic, e.getMessage(), e);
            saveFallback(eventDto);
        }
    }

    /**
     * Direct DB fallback — avoids circular dependency by not calling back into NotificationPublisherService.
     */
    private void saveFallback(NotificationEventDto dto) {
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
            log.info("[GCP Cloud Pub/Sub] Fallback DB save successful: notificationId={}, recipient={}",
                    saved.getNotificationId(), saved.getRecipientUserId());
        } catch (Exception dbErr) {
            log.error("[GCP Cloud Pub/Sub] Fallback DB save also failed: {}", dbErr.getMessage(), dbErr);
        }
    }

    @Override
    public String getProviderName() {
        return "GCP Pub/Sub";
    }

    @PreDestroy
    public void shutdownPublisher() {
        if (publisher != null) {
            try {
                log.info("[GCP Cloud Pub/Sub] Shutting down Publisher for topic [{}]", notificationTopic);
                publisher.shutdown();
                publisher.awaitTermination(10, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.warn("[GCP Cloud Pub/Sub] Error during Publisher shutdown: {}", e.getMessage());
            }
        }
    }
}

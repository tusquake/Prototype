package com.cloudkaptan.sop.service.messaging;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.service.NotificationPublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.core.ApiFuture;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;
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
    private final NotificationPublisherService notificationPublisherService;

    @Value("${spring.cloud.gcp.pubsub.topic.notification:${GCP_PUBSUB_NOTIFICATION_TOPIC:finsop-notification-topic}}")
    private String notificationTopic;

    @Value("${spring.cloud.gcp.project-id:${GCP_PROJECT_ID:finance-sop-portal}}")
    private String gcpProjectId;

    @Override
    public void publish(NotificationEventDto eventDto) {
        Publisher publisher = null;
        try {
            String jsonPayload = objectMapper.writeValueAsString(eventDto);
            log.info("[GCP Cloud Pub/Sub Messaging] Publishing notification event to Topic [projects/{}/topics/{}]: recipient={}, eventType={}",
                    gcpProjectId, notificationTopic, eventDto.getRecipientUserId(), eventDto.getEventType());

            TopicName topicName = TopicName.of(gcpProjectId, notificationTopic);
            publisher = Publisher.newBuilder(topicName).build();

            ByteString data = ByteString.copyFromUtf8(jsonPayload);
            PubsubMessage pubsubMessage = PubsubMessage.newBuilder()
                    .setData(data)
                    .putAttributes("recipientUserId", eventDto.getRecipientUserId() != null ? eventDto.getRecipientUserId() : "")
                    .putAttributes("eventType", eventDto.getEventType() != null ? eventDto.getEventType() : "")
                    .build();

            ApiFuture<String> messageIdFuture = publisher.publish(pubsubMessage);
            String messageId = messageIdFuture.get(10, TimeUnit.SECONDS);
            log.info("[GCP Cloud Pub/Sub Messaging] Successfully published messageId={} to Topic [{}]", messageId, notificationTopic);
        } catch (Exception e) {
            log.error("[GCP Cloud Pub/Sub Messaging] Failed to publish message to topic {}: {}. Fallback to direct DB notification saving.", notificationTopic, e.getMessage(), e);
            // Safety Fallback: Ensure notification is never lost if Pub/Sub topic fails or credentials are restricted
            try {
                notificationPublisherService.saveToDatabase(eventDto);
            } catch (Exception dbErr) {
                log.error("Fallback DB notification save failed: {}", dbErr.getMessage(), dbErr);
            }
        } finally {
            if (publisher != null) {
                try {
                    publisher.shutdown();
                    publisher.awaitTermination(5, TimeUnit.SECONDS);
                } catch (Exception shutdownErr) {
                    log.warn("Error shutting down Pub/Sub publisher: {}", shutdownErr.getMessage());
                }
            }
        }
    }

    @Override
    public String getProviderName() {
        return "GCP Pub/Sub";
    }
}

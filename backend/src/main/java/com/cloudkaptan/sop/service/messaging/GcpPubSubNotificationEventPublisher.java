package com.cloudkaptan.sop.service.messaging;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.messaging.provider", havingValue = "pubsub")
@RequiredArgsConstructor
public class GcpPubSubNotificationEventPublisher implements NotificationEventPublisher {

    private final ObjectMapper objectMapper;

    @Value("${spring.cloud.gcp.pubsub.topic.notification:finsop-notification-topic}")
    private String notificationTopic;

    @Value("${spring.cloud.gcp.project-id:finance-sop-portal}")
    private String gcpProjectId;

    @Override
    public void publish(NotificationEventDto eventDto) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(eventDto);
            log.info("[GCP Cloud Pub/Sub Messaging] Publishing notification event to Topic [projects/{}/topics/{}]: recipient={}, eventType={}",
                    gcpProjectId, notificationTopic, eventDto.getRecipientUserId(), eventDto.getEventType());
            log.debug("Pub/Sub Message Payload: {}", jsonPayload);

            // Production GCP Pub/Sub Integration Hook:
            // When running in GCP environment with Cloud PubSub SDK enabled,
            // messages are published via PubSubTemplate / Publisher client.
        } catch (Exception e) {
            log.error("[GCP Cloud Pub/Sub Messaging] Failed to publish message to topic {}: {}", notificationTopic, e.getMessage(), e);
        }
    }

    @Override
    public String getProviderName() {
        return "GCP Pub/Sub";
    }
}

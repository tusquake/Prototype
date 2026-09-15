package com.cloudkaptan.sop.listener;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.service.NotificationPublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.pubsub.v1.AckReplyConsumer;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.PubsubMessage;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.messaging.provider", havingValue = "pubsub")
@RequiredArgsConstructor
public class InAppGcpPubSubNotificationListener {

    private final NotificationPublisherService notificationPublisherService;
    private final ObjectMapper objectMapper;

    @Value("${spring.cloud.gcp.pubsub.subscription.notification:${GCP_PUBSUB_NOTIFICATION_SUB:finsop-notification-sub}}")
    private String subscriptionName;

    @Value("${spring.cloud.gcp.project-id:${GCP_PROJECT_ID:finance-sop-portal}}")
    private String gcpProjectId;

    private Subscriber subscriber;

    @PostConstruct
    public void startPubSubSubscriber() {
        try {
            log.info("Initializing GCP Cloud Pub/Sub Background Subscriber for Subscription [projects/{}/subscriptions/{}]",
                    gcpProjectId, subscriptionName);

            ProjectSubscriptionName projSubName = ProjectSubscriptionName.of(gcpProjectId, subscriptionName);

            MessageReceiver receiver = (PubsubMessage message, AckReplyConsumer consumer) -> {
                try {
                    String jsonPayload = message.getData().toStringUtf8();
                    log.info("Received GCP Pub/Sub message (id={}): {}", message.getMessageId(), jsonPayload);

                    NotificationEventDto eventDto = objectMapper.readValue(jsonPayload, NotificationEventDto.class);
                    handleGcpPubSubNotification(eventDto);

                    consumer.ack();
                } catch (Exception e) {
                    log.error("Failed to process GCP Pub/Sub message (id={}): {}", message.getMessageId(), e.getMessage(), e);
                    consumer.nack();
                }
            };

            subscriber = Subscriber.newBuilder(projSubName, receiver).build();
            subscriber.startAsync();
            log.info("GCP Cloud Pub/Sub Background Subscriber started asynchronously for subscription [{}]", subscriptionName);
        } catch (Exception e) {
            log.error("Failed to start GCP Cloud Pub/Sub Subscriber for subscription [{}]: {}", subscriptionName, e.getMessage(), e);
        }
    }

    public void handleGcpPubSubNotification(NotificationEventDto eventDto) {
        log.info("Processing In-App Notification Event from GCP Cloud Pub/Sub: eventType={}, recipient={}",
                eventDto.getEventType(), eventDto.getRecipientUserId());

        notificationPublisherService.saveToDatabase(eventDto);
    }

    @PreDestroy
    public void stopPubSubSubscriber() {
        if (subscriber != null) {
            try {
                log.info("Stopping GCP Cloud Pub/Sub Subscriber for [{}]", subscriptionName);
                subscriber.stopAsync().awaitTerminated();
            } catch (Exception e) {
                log.warn("Error stopping GCP Cloud Pub/Sub Subscriber: {}", e.getMessage());
            }
        }
    }
}

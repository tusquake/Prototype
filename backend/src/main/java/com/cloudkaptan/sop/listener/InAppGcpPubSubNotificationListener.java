package com.cloudkaptan.sop.listener;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.service.NotificationPublisherService;
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

    @Value("${spring.cloud.gcp.pubsub.subscription.notification:finsop-notification-sub}")
    private String subscriptionName;

    public void handleGcpPubSubNotification(NotificationEventDto eventDto) {
        log.info("Received In-App Notification Event from GCP Cloud Pub/Sub Subscription [{}]: eventType={}, recipient={}",
                subscriptionName, eventDto.getEventType(), eventDto.getRecipientUserId());

        notificationPublisherService.saveToDatabase(eventDto);
    }
}

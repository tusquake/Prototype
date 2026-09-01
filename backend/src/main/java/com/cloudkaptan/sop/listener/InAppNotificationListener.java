package com.cloudkaptan.sop.listener;

import com.cloudkaptan.sop.config.RabbitMQConfig;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.service.NotificationPublisherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InAppNotificationListener {

    private final NotificationPublisherService notificationPublisherService;

    @RabbitListener(queues = RabbitMQConfig.INAPP_NOTIFICATION_QUEUE)
    public void handleInAppNotification(NotificationEventDto eventDto) {
        log.info("Received In-App Notification Event from RabbitMQ queue [{}]: eventType={}, recipient={}",
                RabbitMQConfig.INAPP_NOTIFICATION_QUEUE, eventDto.getEventType(), eventDto.getRecipientUserId());

        notificationPublisherService.saveToDatabase(eventDto);
    }
}

package com.cloudkaptan.sop.service.messaging;

import com.cloudkaptan.sop.config.RabbitMQConfig;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.messaging.provider", havingValue = "rabbitmq", matchIfMissing = true)
@RequiredArgsConstructor
public class RabbitMQNotificationEventPublisher implements NotificationEventPublisher {

    private final ObjectProvider<RabbitTemplate> rabbitTemplateProvider;

    @Override
    public void publish(NotificationEventDto eventDto) {
        String routingKey = "notification.inapp." + (eventDto.getReferenceEntityType() != null ? eventDto.getReferenceEntityType().toLowerCase() : "general");
        RabbitTemplate template = rabbitTemplateProvider.getIfAvailable();

        if (template != null) {
            log.info("[RabbitMQ Messaging] Publishing notification event: routingKey={}, recipient={}, eventType={}",
                    routingKey, eventDto.getRecipientUserId(), eventDto.getEventType());
            template.convertAndSend(RabbitMQConfig.NOTIFICATION_EXCHANGE, routingKey, eventDto);
        } else {
            log.warn("[RabbitMQ Messaging] RabbitTemplate unavailable, unable to publish message via AMQP.");
        }
    }

    @Override
    public String getProviderName() {
        return "RabbitMQ";
    }
}

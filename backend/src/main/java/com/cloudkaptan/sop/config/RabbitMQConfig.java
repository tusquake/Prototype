package com.cloudkaptan.sop.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String NOTIFICATION_EXCHANGE = "finsop.notification.exchange";
    public static final String INAPP_NOTIFICATION_QUEUE = "finsop.inapp.notifications";
    public static final String INAPP_ROUTING_KEY_PATTERN = "notification.inapp.#";

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE, true, false);
    }

    @Bean
    public Queue inAppNotificationQueue() {
        return QueueBuilder.durable(INAPP_NOTIFICATION_QUEUE).build();
    }

    @Bean
    public Binding inAppNotificationBinding(Queue inAppNotificationQueue, TopicExchange notificationExchange) {
        return BindingBuilder.bind(inAppNotificationQueue)
                .to(notificationExchange)
                .with(INAPP_ROUTING_KEY_PATTERN);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}

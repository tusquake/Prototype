package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.service.NotificationPublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/finsop/v1/pubsub")
@RequiredArgsConstructor
@Tag(name = "GCP Cloud Pub/Sub Push Endpoint", description = "Receives GCP Pub/Sub Push Subscription HTTP POST notifications")
public class GcpPubSubPushController {

    private final NotificationPublisherService notificationPublisherService;
    private final ObjectMapper objectMapper;

    @PostMapping("/push-notification")
    @Operation(summary = "Receive GCP Pub/Sub Push HTTP POST notification", description = "Endpoint configured as Push URL in GCP Pub/Sub Subscription")
    public ResponseEntity<Void> receivePubSubPushNotification(@RequestBody PubSubPushPayload payload) {
        try {
            if (payload != null && payload.getMessage() != null && payload.getMessage().getData() != null) {
                String base64Data = payload.getMessage().getData();
                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                String jsonPayload = new String(decodedBytes, StandardCharsets.UTF_8);

                log.info("Received GCP Pub/Sub Push Webhook (messageId={}): {}", payload.getMessage().getMessageId(), jsonPayload);

                NotificationEventDto eventDto = objectMapper.readValue(jsonPayload, NotificationEventDto.class);
                notificationPublisherService.saveToDatabase(eventDto);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to process GCP Pub/Sub Push Notification: {}", e.getMessage(), e);
            return ResponseEntity.ok().build(); // Return 200 OK so GCP doesn't retry infinitely on malformed payload
        }
    }

    @Data
    public static class PubSubPushPayload {
        private PubSubMessageWrapper message;
        private String subscription;
    }

    @Data
    public static class PubSubMessageWrapper {
        private String data;
        private Map<String, String> attributes;
        private String messageId;
        private String publishTime;
    }
}

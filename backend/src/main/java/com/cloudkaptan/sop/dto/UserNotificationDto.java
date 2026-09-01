package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationDto {

    private UUID notificationId;
    private String recipientUserId;
    private String eventType;
    private String title;
    private String message;
    private String referenceEntityType;
    private String referenceEntityId;
    private Boolean isRead;
    private OffsetDateTime createdAt;
}

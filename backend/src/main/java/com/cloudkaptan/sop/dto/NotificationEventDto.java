package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEventDto implements Serializable {

    private String recipientUserId;
    private String eventType;
    private String title;
    private String message;
    private String referenceEntityType;
    private String referenceEntityId;
}

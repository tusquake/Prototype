package com.cloudkaptan.sop.service.messaging;

import com.cloudkaptan.sop.dto.NotificationEventDto;

public interface NotificationEventPublisher {
    void publish(NotificationEventDto eventDto);
    String getProviderName();
}

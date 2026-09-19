package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationFilterRequest {
    private String userId;
    private Boolean isRead;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}

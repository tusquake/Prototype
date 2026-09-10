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
public class GenerateUploadUrlResponse {
    private UUID taskId;
    private String fileName;
    private String gcsObjectPath;
    private String uploadUrl;
    private OffsetDateTime expiresAt;
}

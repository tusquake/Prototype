package com.cloudkaptan.sop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmUploadRequest {
    @NotNull(message = "taskId is required")
    private UUID taskId;

    @NotBlank(message = "fileName is required")
    private String fileName;

    @NotBlank(message = "gcsObjectPath is required")
    private String gcsObjectPath;

    private Long fileSize;

    private String contentType;

    @NotBlank(message = "actorId is required")
    private String actorId;
}

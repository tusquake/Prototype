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
public class GenerateUploadUrlRequest {
    @NotNull(message = "taskId is required")
    private UUID taskId;

    @NotBlank(message = "fileName is required")
    private String fileName;

    private String contentType;

    private Long fileSize;

    @NotBlank(message = "actorId is required")
    private String actorId;
}

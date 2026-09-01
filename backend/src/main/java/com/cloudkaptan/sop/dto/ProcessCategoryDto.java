package com.cloudkaptan.sop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessCategoryDto {
    private UUID id;

    @NotBlank(message = "categoryCode is required")
    private String categoryCode;

    @NotBlank(message = "categoryName is required")
    private String categoryName;

    private String description;
}

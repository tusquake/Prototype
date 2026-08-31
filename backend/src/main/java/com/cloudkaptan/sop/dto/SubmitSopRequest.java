package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitSopRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Frequency is required")
    private SopFrequency frequency;

    @NotNull(message = "Due day offset is required")
    private Integer dueDayOffset;

    private Boolean isRecurring;

    private List<String> defaultMakerIds;

    private List<String> defaultCheckerIds;

    private String actorId;
}

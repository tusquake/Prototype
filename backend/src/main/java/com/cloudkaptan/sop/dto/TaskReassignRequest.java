package com.cloudkaptan.sop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskReassignRequest {

    @NotBlank(message = "actorId is required")
    private String actorId;

    private List<String> makerIds;
    private List<String> checkerIds;

    private String reason;
}

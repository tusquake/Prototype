package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SopDto {
    private UUID sopId;
    private String sopCode;
    private String title;
    private String description;
    private String processCategory;
    private EntityCode entityCode;
    private String entityName;
    private SopFrequency frequency;
    private Integer dueDayOffset;
    private String defaultMakerId;
    private String defaultMakerName;
    private String defaultCheckerId;
    private String defaultCheckerName;
    private SopStatus status;
}

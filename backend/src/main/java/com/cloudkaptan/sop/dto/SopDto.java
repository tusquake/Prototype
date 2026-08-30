package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
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
    private List<String> defaultMakerIds;
    private List<String> defaultMakerNames;
    private String defaultCheckerId;
    private String defaultCheckerName;
    private List<String> defaultCheckerIds;
    private List<String> defaultCheckerNames;
    private SopStatus status;
    private Integer version;
}

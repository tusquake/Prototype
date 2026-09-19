package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SopFilterRequest {
    private List<EntityCode> entities;
    private SopStatus status;
    private String category;
    private SopFrequency frequency;
    private String search;
    private String userId;
    private String userRole;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}

package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoSettingsDto {
    private Boolean autoInstantiateOnApproval;
    private Boolean bypassRecurrenceCheck;
    private LocalDate forcedExecutionDate;
}

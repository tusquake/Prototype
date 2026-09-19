package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFilterRequest {
    private String search;
    private UserRole role;
    private String roleName;   // accepts plain string: MAKER, CHECKER, ADMIN, VIEWER
    private EntityCode entityCode;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}

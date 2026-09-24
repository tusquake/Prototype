package com.cloudkaptan.sop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelUploadResultDto {
    private int totalSheets;
    private int totalRowsProcessed;
    private int templatesCreatedCount;
    private int templatesSkippedCount;
    private int entitiesCreatedCount;
    private int categoriesCreatedCount;

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    @Builder.Default
    private List<String> errors = new ArrayList<>();
}

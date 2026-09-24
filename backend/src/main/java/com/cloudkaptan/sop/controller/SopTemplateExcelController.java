package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.ExcelUploadResultDto;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.service.SopTemplateExcelImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/finsop/v1/sop-templates")
@RequiredArgsConstructor
@Tag(name = "SOP Template Excel & Row Import", description = "Bulk Excel upload and single-row template creation endpoints")
public class SopTemplateExcelController {

    private final SopTemplateExcelImportService excelImportService;

    @PostMapping(value = "/upload-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload SOP & Task Templates Excel Spreadsheet",
               description = "Parses Excel workbook across all sheets to bulk create active SOP Templates and Task Templates, auto-populating entities, categories, and maker/checker pools.")
    public ResponseEntity<ApiResponse<ExcelUploadResultDto>> uploadTemplatesExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "usr-manoj-042") String actorId,
            @RequestParam(required = false, defaultValue = "false") boolean overwriteExisting
    ) {
        ExcelUploadResultDto result = excelImportService.processExcelUpload(file, actorId, overwriteExisting);
        return ResponseEntity.ok(ApiResponse.success(
                result,
                String.format("Excel processing complete: %d active templates created across %d sheets (%d skipped, %d warnings).",
                        result.getTemplatesCreatedCount(), result.getTotalSheets(), result.getTemplatesSkippedCount(), result.getWarnings().size())
        ));
    }

    @PostMapping(value = "/create-single", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Create Single SOP & Task Template Row",
               description = "Manually creates a single active SOP Template and attached Task Template (like adding 108th row), auto-populating entity, category, maker/checker pools, and parsing due date recurrence.")
    public ResponseEntity<ApiResponse<SingleTemplateResponseDto>> createSingleTemplate(
            @Valid @RequestBody CreateSingleSopTemplateRowRequest request
    ) {
        SingleTemplateResponseDto result = excelImportService.createSingleTemplateRow(request);
        HttpStatus status = result.isNewlyCreated() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ApiResponse.success(result, result.getMessage()));
    }
}

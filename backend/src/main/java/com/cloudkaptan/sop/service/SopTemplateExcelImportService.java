package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.ExcelUploadResultDto;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.util.ExcelAliasResolverUtils;
import com.cloudkaptan.sop.util.ExcelParserUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SopTemplateExcelImportService {

    private final SopTemplateRowProcessorService rowProcessorService;

    public ExcelUploadResultDto processExcelUpload(MultipartFile file, String actorId, boolean overwriteExisting) {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Uploaded file is empty or missing.");
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))
            throw new IllegalArgumentException("Invalid Excel spreadsheet.");

        ExcelUploadResultDto result = new ExcelUploadResultDto();
        Set<String> processedKeys = new HashSet<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            result.setTotalSheets(workbook.getNumberOfSheets());
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                if (sheet == null)
                    continue;
                String sheetName = sheet.getSheetName();
                int headerRowIndex = findHeaderRowIndex(sheet);

                if (headerRowIndex == -1) {
                    result.getWarnings().add("Sheet '" + sheetName + "' skipped: Could not locate headers.");
                    continue;
                }

                Map<String, Integer> colMap = buildColumnMap(sheet.getRow(headerRowIndex));
                for (int r = headerRowIndex + 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null || ExcelParserUtils.isRowBlank(row))
                        continue;
                    result.setTotalRowsProcessed(result.getTotalRowsProcessed() + 1);

                    try {
                        importSingleRow(sheetName, r, row, colMap, actorId, overwriteExisting, result, processedKeys);
                    } catch (Exception re) {
                        // DIG FOR THE ROOT CAUSE ERROR
                        Throwable rootCause = re;
                        while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
                            rootCause = rootCause.getCause();
                        }

                        String errMsg = String.format("Sheet '%s', Row %d: %s", sheetName, r + 1,
                                rootCause.getMessage());
                        log.error("Row import failed at Sheet '{}' Row {}", sheetName, r + 1, re);
                        result.getErrors().add(errMsg);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Excel workbook: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to read Excel workbook: " + e.getMessage(), e);
        }
        return result;
    }

    private void importSingleRow(String sheetName, int rowIndex, Row row, Map<String, Integer> colMap,
            String actorId, boolean overwriteExisting, ExcelUploadResultDto result, Set<String> processedKeys) {
        String rawEntity = getCellValue(row, colMap, "entity");
        String rawProcess = getCellValue(row, colMap, "process");
        String rawTask = getCellValue(row, colMap, "task");
        String rawMaker = getCellValue(row, colMap, "maker");
        String rawChecker = getCellValue(row, colMap, "checker");
        String rawDueDate = getCellValue(row, colMap, "due date");
        String rawConsultant = getCellValue(row, colMap, "consultant review");

        if (rawEntity.isBlank() && rawTask.isBlank())
            return;
        if (rawTask.isBlank()) {
            result.getWarnings().add(String.format("Sheet '%s', Row %d: Skipped because 'Task' column is empty.",
                    sheetName, rowIndex + 1));
            return;
        }

        String cleanedTitle = rawTask.replaceAll("\\r?\\n", " ").trim();
        String title = cleanedTitle.length() > 255 ? cleanedTitle.substring(0, 252) + "..." : cleanedTitle;
        EntityCode entityCode = ExcelAliasResolverUtils.resolveEntityCode(rawEntity);
        String normalizedCategory = ExcelAliasResolverUtils.normalizeCategory(rawProcess);

        String dedupeKey = entityCode.name() + "|" + normalizedCategory.toLowerCase() + "|" + title.toLowerCase();
        if (processedKeys.contains(dedupeKey)) {
            result.getWarnings()
                    .add(String.format("Sheet '%s', Row %d: Skipped duplicate row.", sheetName, rowIndex + 1));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
            return;
        }
        processedKeys.add(dedupeKey);

        CreateSingleSopTemplateRowRequest request = CreateSingleSopTemplateRowRequest.builder()
                .entity(rawEntity).processCategory(rawProcess).title(title).dueDateText(rawDueDate)
                .frequency(sheetName).maker(rawMaker).checker(rawChecker).consultantReview(rawConsultant)
                .actorId(actorId).overwriteExisting(overwriteExisting).build();

        try {
            SingleTemplateResponseDto response = rowProcessorService.createSingleTemplateRow(request);
            if (response.isNewlyCreated() || response.isOverwritten()) {
                result.setTemplatesCreatedCount(result.getTemplatesCreatedCount() + 1);
            }
        } catch (IllegalStateException ise) {
            result.getWarnings()
                    .add(String.format("Sheet '%s', Row %d: %s", sheetName, rowIndex + 1, ise.getMessage()));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
        }
    }

    public SingleTemplateResponseDto createSingleTemplateRow(CreateSingleSopTemplateRowRequest request) {
        return rowProcessorService.createSingleTemplateRow(request);
    }

    private int findHeaderRowIndex(Sheet sheet) {
        for (int r = 0; r <= Math.min(10, sheet.getLastRowNum()); r++) {
            Row row = sheet.getRow(r);
            if (row == null)
                continue;
            for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
                String text = ExcelParserUtils.getCellValueAsString(row.getCell(c)).toLowerCase();
                if (text.contains("entity") || text.contains("task") || text.contains("process"))
                    return r;
            }
        }
        return -1;
    }

    private Map<String, Integer> buildColumnMap(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        if (headerRow == null)
            return map;
        for (int c = headerRow.getFirstCellNum(); c < headerRow.getLastCellNum(); c++) {
            String text = ExcelParserUtils.getCellValueAsString(headerRow.getCell(c)).toLowerCase();
            if (text.contains("entity"))
                map.put("entity", c);
            else if (text.contains("process"))
                map.put("process", c);
            else if (text.contains("task"))
                map.put("task", c);
            else if (text.contains("maker"))
                map.put("maker", c);
            else if (text.contains("checker"))
                map.put("checker", c);
            else if (text.contains("due"))
                map.put("due date", c);
            else if (text.contains("consultant") || text.contains("review"))
                map.put("consultant review", c);
        }
        return map;
    }

    private String getCellValue(Row row, Map<String, Integer> colMap, String colName) {
        Integer idx = colMap.get(colName);
        return idx == null ? "" : ExcelParserUtils.getCellValueAsString(row.getCell(idx));
    }
}
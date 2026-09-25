package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.ExcelUploadResultDto;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.util.ExcelAliasResolverUtils;
import com.cloudkaptan.sop.util.ExcelParserUtils;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

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
                        String friendlyMsg = extractFriendlyErrorMessage(re);
                        String errMsg = String.format("Sheet '%s', Row %d: %s", sheetName, r + 1, friendlyMsg);
                        log.error("Row import failed at Sheet '{}' Row {}: {}", sheetName, r + 1, friendlyMsg, re);
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
        } catch (DataIntegrityViolationException dive) {
            String detail = extractFriendlyErrorMessage(dive);
            result.getErrors().add(String.format("Sheet '%s', Row %d: Data integrity error — %s", sheetName, rowIndex + 1, detail));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
        } catch (TransactionSystemException tse) {
            String detail = extractFriendlyErrorMessage(tse);
            result.getErrors().add(String.format("Sheet '%s', Row %d: Validation/transaction error — %s", sheetName, rowIndex + 1, detail));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
        } catch (Exception ex) {
            String detail = extractFriendlyErrorMessage(ex);
            result.getErrors().add(String.format("Sheet '%s', Row %d: Unexpected error — %s", sheetName, rowIndex + 1, detail));
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

    /**
     * Extracts a human-readable error message from any exception, unwrapping
     * Spring's TransactionSystemException, DataIntegrityViolationException, and
     * ConstraintViolationException layers to surface the real cause.
     */
    private String extractFriendlyErrorMessage(Exception ex) {
        // 1. TransactionSystemException — unwrap to find real cause inside
        if (ex instanceof TransactionSystemException tse) {
            Throwable appException = tse.getApplicationException();
            if (appException == null) appException = tse.getOriginalException();
            if (appException == null) appException = tse.getMostSpecificCause();
            if (appException instanceof ConstraintViolationException cve) {
                return formatConstraintViolations(cve);
            }
            return extractRootMessage(appException != null ? appException : tse);
        }

        // 2. DataIntegrityViolationException — parse SQL constraint details
        if (ex instanceof DataIntegrityViolationException dive) {
            Throwable rootCause = dive.getMostSpecificCause();
            String rootMsg = rootCause.getMessage();
            if (rootMsg != null) {
                // Extract user-friendly parts from common DB error messages
                if (rootMsg.contains("unique constraint") || rootMsg.contains("Unique index") || rootMsg.contains("UNIQUE") || rootMsg.contains("Duplicate")) {
                    return "Duplicate entry detected. A record with the same unique key already exists. " + extractKeyDetail(rootMsg);
                }
                if (rootMsg.contains("not-null") || rootMsg.contains("NOT NULL") || rootMsg.contains("cannot be null")) {
                    return "A required field is missing or null. " + extractKeyDetail(rootMsg);
                }
                if (rootMsg.contains("too long") || rootMsg.contains("value too long") || rootMsg.contains("String data, right truncated")) {
                    return "A field value exceeds the maximum allowed length. " + extractKeyDetail(rootMsg);
                }
                if (rootMsg.contains("foreign key") || rootMsg.contains("Referential integrity constraint violation")) {
                    return "A referenced record does not exist (foreign key violation). " + extractKeyDetail(rootMsg);
                }
                // Fallback: return the root message truncated for readability
                return rootMsg.length() > 200 ? rootMsg.substring(0, 200) + "..." : rootMsg;
            }
            return dive.getMessage();
        }

        // 3. ConstraintViolationException (Jakarta Bean Validation)
        if (ex instanceof ConstraintViolationException cve) {
            return formatConstraintViolations(cve);
        }

        // 4. Generic fallback — dig for root cause
        return extractRootMessage(ex);
    }

    private String formatConstraintViolations(ConstraintViolationException cve) {
        Set<ConstraintViolation<?>> violations = cve.getConstraintViolations();
        if (violations == null || violations.isEmpty()) {
            return cve.getMessage();
        }
        return violations.stream()
                .map(v -> String.format("'%s' %s", v.getPropertyPath(), v.getMessage()))
                .collect(Collectors.joining("; "));
    }

    private String extractRootMessage(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String msg = root.getMessage();
        if (msg == null || msg.isBlank()) {
            msg = root.getClass().getSimpleName();
        }
        // Strip overly verbose Spring/Hibernate wrapper messages
        if (msg.contains("Transaction silently rolled back")) {
            return "Row processing failed due to a data validation error. Check field values are valid and within allowed limits.";
        }
        if (msg.contains("could not execute statement")) {
            Throwable cause = root.getCause() != null ? root.getCause() : root;
            return cause.getMessage() != null ? cause.getMessage() : msg;
        }
        return msg.length() > 250 ? msg.substring(0, 247) + "..." : msg;
    }

    private String extractKeyDetail(String rawMsg) {
        // Try to extract column/table info from common DB error formats
        // H2: "... column "NAME" ...", PostgreSQL: "... Key (column)=(value) ..."
        if (rawMsg.contains("column \"")) {
            int start = rawMsg.indexOf("column \"") + 8;
            int end = rawMsg.indexOf('"', start);
            if (end > start) return "(column: " + rawMsg.substring(start, end) + ")";
        }
        if (rawMsg.contains("Key (")) {
            int start = rawMsg.indexOf("Key (");
            int end = rawMsg.indexOf(')', start);
            if (end > start) return "(" + rawMsg.substring(start, end + 1) + ")";
        }
        return "";
    }
}
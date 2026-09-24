package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.ExcelUploadResultDto;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.entity.*;
import com.cloudkaptan.sop.repository.*;
import com.cloudkaptan.sop.util.DueDateParserUtils;
import com.cloudkaptan.sop.util.ExcelAliasResolverUtils;
import com.cloudkaptan.sop.util.ExcelParserUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SopTemplateExcelImportService {

    private final SopTemplateRepository sopTemplateRepository;
    private final TaskTemplateRepository taskTemplateRepository;
    private final CorporateEntityRepository corporateEntityRepository;
    private final ProcessCategoryRepository processCategoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SopTemplateEventRepository sopTemplateEventRepository;

    public ExcelUploadResultDto processExcelUpload(MultipartFile file, String actorId, boolean overwriteExisting) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty or missing.");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
            throw new IllegalArgumentException("Uploaded file is not a valid Excel (.xlsx / .xls) spreadsheet.");
        }

        ExcelUploadResultDto result = new ExcelUploadResultDto();
        Set<String> processedKeys = new HashSet<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            int sheetCount = workbook.getNumberOfSheets();
            result.setTotalSheets(sheetCount);

            for (int s = 0; s < sheetCount; s++) {
                Sheet sheet = workbook.getSheetAt(s);
                if (sheet == null) continue;
                String sheetName = sheet.getSheetName();

                int headerRowIndex = findHeaderRowIndex(sheet);
                if (headerRowIndex == -1) {
                    result.getWarnings().add("Sheet '" + sheetName + "' skipped: Could not locate header row containing Entity/Process/Task columns.");
                    continue;
                }

                Row headerRow = sheet.getRow(headerRowIndex);
                Map<String, Integer> colMap = buildColumnMap(headerRow);

                for (int r = headerRowIndex + 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null || ExcelParserUtils.isRowBlank(row)) continue;

                    result.setTotalRowsProcessed(result.getTotalRowsProcessed() + 1);

                    try {
                        importSingleRow(sheetName, r, row, colMap, actorId, overwriteExisting, result, processedKeys);
                    } catch (Exception re) {
                        String errMsg = String.format("Sheet '%s', Row %d: %s", sheetName, r + 1, re.getMessage());
                        log.warn(errMsg, re);
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

        if (rawEntity.isBlank() && rawTask.isBlank()) {
            return; // Skip empty row
        }

        if (rawTask.isBlank()) {
            result.getWarnings().add(String.format("Sheet '%s', Row %d: Skipped because 'Task' column is empty.", sheetName, rowIndex + 1));
            return;
        }

        // Clean & truncate Task Title (Max 255 chars)
        String cleanedTitle = rawTask.replaceAll("\\r?\\n", " ").trim();
        String title = cleanedTitle.length() > 255 ? cleanedTitle.substring(0, 252) + "..." : cleanedTitle;

        EntityCode entityCode = ExcelAliasResolverUtils.resolveEntityCode(rawEntity);
        String normalizedCategory = ExcelAliasResolverUtils.normalizeCategory(rawProcess);

        // Session-level Deduplication Check
        String dedupeKey = entityCode.name() + "|" + normalizedCategory.toLowerCase() + "|" + title.toLowerCase();
        if (processedKeys.contains(dedupeKey)) {
            result.getWarnings().add(String.format("Sheet '%s', Row %d: Skipped duplicate row for '%s' (%s).", sheetName, rowIndex + 1, title, entityCode));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
            return;
        }
        processedKeys.add(dedupeKey);

        CreateSingleSopTemplateRowRequest request = CreateSingleSopTemplateRowRequest.builder()
                .entity(rawEntity)
                .processCategory(rawProcess)
                .title(title)
                .dueDateText(rawDueDate)
                .frequency(sheetName)
                .maker(rawMaker)
                .checker(rawChecker)
                .consultantReview(rawConsultant)
                .actorId(actorId)
                .overwriteExisting(overwriteExisting)
                .build();

        try {
            SingleTemplateResponseDto response = createSingleTemplateRow(request);
            if (response.isNewlyCreated() || response.isOverwritten()) {
                result.setTemplatesCreatedCount(result.getTemplatesCreatedCount() + 1);
            }
        } catch (IllegalStateException ise) {
            result.getWarnings().add(String.format("Sheet '%s', Row %d: %s", sheetName, rowIndex + 1, ise.getMessage()));
            result.setTemplatesSkippedCount(result.getTemplatesSkippedCount() + 1);
        }
    }

    /**
     * Creates or updates a single SOP Template + Task Template row manually via JSON API.
     */
    @Transactional
    public SingleTemplateResponseDto createSingleTemplateRow(CreateSingleSopTemplateRowRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body cannot be null.");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required.");
        }

        // Clean & truncate Task Title (Max 255 chars)
        String cleanedTitle = request.getTitle().replaceAll("\\r?\\n", " ").trim();
        String title = cleanedTitle.length() > 255 ? cleanedTitle.substring(0, 252) + "..." : cleanedTitle;

        // 1. Resolve Entity Code & CorporateEntity
        String rawEntity = (request.getEntity() != null && !request.getEntity().isBlank()) ? request.getEntity() : "CK_INDIA";
        EntityCode entityCode = ExcelAliasResolverUtils.resolveEntityCode(rawEntity);
        CorporateEntity entity = corporateEntityRepository.findById(entityCode).orElseGet(() -> {
            CorporateEntity newEntity = CorporateEntity.builder()
                    .entityCode(entityCode)
                    .entityName("CK " + entityCode.name().replace("CK_", ""))
                    .build();
            return corporateEntityRepository.save(newEntity);
        });

        // 2. Resolve ProcessCategory
        String rawProcess = (request.getProcessCategory() != null && !request.getProcessCategory().isBlank()) ? request.getProcessCategory() : "GENERAL";
        String normalizedCategory = ExcelAliasResolverUtils.normalizeCategory(rawProcess);
        ProcessCategory category = processCategoryRepository.findByCategoryNameIgnoreCase(normalizedCategory).orElseGet(() -> {
            String catCode = ExcelAliasResolverUtils.getCategoryCodePrefix(normalizedCategory) + "-" + System.currentTimeMillis() % 1000;
            ProcessCategory newCat = ProcessCategory.builder()
                    .categoryCode(catCode)
                    .categoryName(normalizedCategory)
                    .description("Auto-provisioned category for SOP template creation")
                    .build();
            return processCategoryRepository.save(newCat);
        });

        // 3. Database Idempotency Check
        Optional<SopTemplate> existingOpt = sopTemplateRepository
                .findByEntityEntityCodeAndProcessCategoryIgnoreCaseAndTitleIgnoreCase(
                        entityCode, normalizedCategory, title);

        boolean overwrite = Boolean.TRUE.equals(request.getOverwriteExisting());
        if (existingOpt.isPresent() && !overwrite) {
            throw new IllegalStateException(String.format(
                    "SOP Template already exists with code [%s] for entity '%s' and title '%s'. Pass 'overwriteExisting: true' to overwrite.",
                    existingOpt.get().getTemplateCode(), entityCode, title));
        }

        // 4. Parse Due Date & Recurrence
        DueDateParserUtils.ParsedRecurrence parsedRecurrence;
        if (request.getDueDateText() != null && !request.getDueDateText().isBlank()) {
            parsedRecurrence = DueDateParserUtils.parseDueDate(request.getDueDateText(), request.getFrequency());
        } else if (request.getFrequency() != null && !request.getFrequency().isBlank()) {
            SopFrequency freq;
            try {
                freq = SopFrequency.valueOf(request.getFrequency().trim().toUpperCase());
            } catch (Exception e) {
                freq = SopFrequency.MONTHLY;
            }
            parsedRecurrence = DueDateParserUtils.ParsedRecurrence.builder()
                    .frequency(freq)
                    .recurrenceConfigJson(null)
                    .dueDayOffset(15)
                    .rawText(request.getFrequency())
                    .build();
        } else {
            parsedRecurrence = DueDateParserUtils.ParsedRecurrence.builder()
                    .frequency(SopFrequency.MONTHLY)
                    .recurrenceConfigJson(null)
                    .dueDayOffset(15)
                    .rawText("Monthly")
                    .build();
        }

        // 5. Maker & Checker User IDs Resolution
        List<String> makerIds;
        if (request.getMakerUserIds() != null && !request.getMakerUserIds().isEmpty()) {
            makerIds = new ArrayList<>(request.getMakerUserIds());
        } else {
            makerIds = ExcelAliasResolverUtils.resolveMakerUserIds(request.getMaker());
        }

        List<String> checkerIds;
        if (request.getCheckerUserIds() != null && !request.getCheckerUserIds().isEmpty()) {
            checkerIds = new ArrayList<>(request.getCheckerUserIds());
        } else {
            checkerIds = ExcelAliasResolverUtils.resolveCheckerUserIds(request.getChecker(), makerIds);
        }

        // 6. Resolve Creator User
        String actId = (request.getActorId() != null && !request.getActorId().isBlank()) ? request.getActorId() : "usr-manoj-042";
        User creator = userRepository.findById(actId)
                .orElseGet(() -> userRepository.findFirstByOrderByCreatedAtAsc().orElse(null));
        if (creator == null) {
            throw new IllegalStateException(
                    "Cannot create SOP template: no User record found in database. actorId='" + actId + "'.");
        }

        SopTemplate template;
        boolean newlyCreated = false;
        boolean isOverwritten = false;

        if (existingOpt.isPresent()) {
            // Update existing
            template = existingOpt.get();
            template.setFrequency(parsedRecurrence.getFrequency());
            template.setRecurrenceConfig(parsedRecurrence.getRecurrenceConfigJson());
            template.setDueDayOffset(parsedRecurrence.getDueDayOffset());
            template.setDefaultMakerIds(new ArrayList<>(makerIds));
            template.setDefaultCheckerIds(new ArrayList<>(checkerIds));
            if (request.getEffectiveFrom() != null) {
                template.setEffectiveFrom(request.getEffectiveFrom());
            }
            isOverwritten = true;
        } else {
            // Create new
            String catPrefix = ExcelAliasResolverUtils.getCategoryCodePrefix(normalizedCategory);
            String baseCode = String.format("TPL-%s-%s", entityCode.name(), catPrefix);
            String templateCode = generateUniqueTemplateCode(baseCode);

            template = SopTemplate.builder()
                    .templateCode(templateCode)
                    .title(title)
                    .description(cleanedTitle)
                    .processCategory(normalizedCategory)
                    .entity(entity)
                    .frequency(parsedRecurrence.getFrequency())
                    .recurrenceConfig(parsedRecurrence.getRecurrenceConfigJson())
                    .dueDayOffset(parsedRecurrence.getDueDayOffset())
                    .isRecurring(true)
                    .effectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now())
                    .status(SopTemplateStatus.ACTIVE)
                    .defaultMakerIds(new ArrayList<>(makerIds))
                    .defaultCheckerIds(new ArrayList<>(checkerIds))
                    .createdBy(creator)
                    .build();
            newlyCreated = true;
        }

        SopTemplate savedTemplate = sopTemplateRepository.save(template);

        // 7. Save/Update attached TaskTemplate
        StringBuilder taskDesc = new StringBuilder(cleanedTitle);
        if (request.getConsultantReview() != null && !request.getConsultantReview().isBlank()
                && !request.getConsultantReview().equalsIgnoreCase("NO") && !request.getConsultantReview().equalsIgnoreCase("N/A")) {
            taskDesc.append(" | External Reviewer: ").append(request.getConsultantReview().trim());
        }

        String taskPriority = (request.getPriority() != null && !request.getPriority().isBlank()) ? request.getPriority() : "Medium";
        int taskSlaHours = (request.getSlaHours() != null && request.getSlaHours() > 0) ? request.getSlaHours() : 72;

        List<TaskTemplate> existingTasks = taskTemplateRepository.findBySopTemplate_TemplateIdOrderByStepSequenceAsc(savedTemplate.getTemplateId());
        TaskTemplate taskTemplate;
        if (!existingTasks.isEmpty()) {
            taskTemplate = existingTasks.get(0);
        } else {
            taskTemplate = TaskTemplate.builder()
                    .sopTemplate(savedTemplate)
                    .stepSequence(1)
                    .build();
        }

        taskTemplate.setTaskName(title);
        taskTemplate.setDescription(taskDesc.toString());
        taskTemplate.setDependencyMode("INDEPENDENT");
        taskTemplate.setPriority(taskPriority);
        taskTemplate.setEtaStartDay(0);
        taskTemplate.setEtaEndDay(parsedRecurrence.getDueDayOffset());
        taskTemplate.setSlaHours(taskSlaHours);
        taskTemplate.setMakerIds(new ArrayList<>(makerIds));
        taskTemplate.setCheckerIds(new ArrayList<>(checkerIds));

        TaskTemplate savedTask = taskTemplateRepository.save(taskTemplate);

        // 8. Audit logging
        logAuditTrail(savedTemplate, actId, newlyCreated ? "SINGLE_ROW_CREATE" : "SINGLE_ROW_UPDATE",
                (newlyCreated ? "Created" : "Updated") + " single SOP template row: " + title);

        log.info("Successfully {} SOP Template [{}] for task '{}' ({})",
                newlyCreated ? "created" : "updated", savedTemplate.getTemplateCode(), title, entityCode);

        return SingleTemplateResponseDto.builder()
                .templateId(savedTemplate.getTemplateId())
                .templateCode(savedTemplate.getTemplateCode())
                .title(savedTemplate.getTitle())
                .description(savedTemplate.getDescription())
                .processCategory(savedTemplate.getProcessCategory())
                .entityCode(savedTemplate.getEntity().getEntityCode())
                .frequency(savedTemplate.getFrequency())
                .status(savedTemplate.getStatus())
                .recurrenceConfig(savedTemplate.getRecurrenceConfig())
                .dueDayOffset(savedTemplate.getDueDayOffset())
                .effectiveFrom(savedTemplate.getEffectiveFrom())
                .defaultMakerIds(savedTemplate.getDefaultMakerIds())
                .defaultCheckerIds(savedTemplate.getDefaultCheckerIds())
                .taskTemplateId(savedTask.getTaskTemplateId())
                .createdById(creator.getUserId())
                .newlyCreated(newlyCreated)
                .overwritten(isOverwritten)
                .message(String.format("SOP Template [%s] %s successfully.",
                        savedTemplate.getTemplateCode(), newlyCreated ? "created" : "updated"))
                .build();
    }

    private String generateUniqueTemplateCode(String baseCode) {
        String code = baseCode;
        int counter = 1;
        while (sopTemplateRepository.existsByTemplateCode(code)) {
            code = String.format("%s-%03d", baseCode, counter++);
        }
        return code;
    }

    private int findHeaderRowIndex(Sheet sheet) {
        for (int r = 0; r <= Math.min(10, sheet.getLastRowNum()); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
                Cell cell = row.getCell(c);
                String text = ExcelParserUtils.getCellValueAsString(cell).toLowerCase();
                if (text.contains("entity") || text.contains("task") || text.contains("process")) {
                    return r;
                }
            }
        }
        return -1;
    }

    private Map<String, Integer> buildColumnMap(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        if (headerRow == null) return map;
        for (int c = headerRow.getFirstCellNum(); c < headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c);
            String text = ExcelParserUtils.getCellValueAsString(cell).toLowerCase();
            if (text.contains("entity")) map.put("entity", c);
            else if (text.contains("process")) map.put("process", c);
            else if (text.contains("task")) map.put("task", c);
            else if (text.contains("maker")) map.put("maker", c);
            else if (text.contains("checker")) map.put("checker", c);
            else if (text.contains("due")) map.put("due date", c);
            else if (text.contains("consultant") || text.contains("review")) map.put("consultant review", c);
        }
        return map;
    }

    private String getCellValue(Row row, Map<String, Integer> colMap, String colName) {
        Integer idx = colMap.get(colName);
        if (idx == null) return "";
        Cell cell = row.getCell(idx);
        return ExcelParserUtils.getCellValueAsString(cell);
    }

    private void logAuditTrail(SopTemplate template, String actorId, String action, String comment) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .actorId(actorId)
                    .action(action)
                    .entityType("SOP_TEMPLATE")
                    .entityId(template.getTemplateId().toString())
                    .correlationId(comment)
                    .build());

            User actor = userRepository.findById(actorId).orElse(null);
            sopTemplateEventRepository.save(SopTemplateEvent.builder()
                    .sopTemplate(template)
                    .actor(actor)
                    .action(action)
                    .toStatus(template.getStatus())
                    .comment(comment)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to save audit log for template [{}]: {}", template.getTemplateId(), e.getMessage());
        }
    }
}

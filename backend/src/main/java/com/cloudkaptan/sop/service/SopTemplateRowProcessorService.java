package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.entity.*;
import com.cloudkaptan.sop.repository.*;
import com.cloudkaptan.sop.util.DueDateParserUtils;
import com.cloudkaptan.sop.util.ExcelAliasResolverUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SopTemplateRowProcessorService {

    private final SopTemplateRepository sopTemplateRepository;
    private final TaskTemplateRepository taskTemplateRepository;
    private final CorporateEntityRepository corporateEntityRepository;
    private final ProcessCategoryRepository processCategoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SopTemplateEventRepository sopTemplateEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SingleTemplateResponseDto createSingleTemplateRow(CreateSingleSopTemplateRowRequest request) {
        if (request == null) throw new IllegalArgumentException("Request body cannot be null.");
        if (request.getTitle() == null || request.getTitle().isBlank()) throw new IllegalArgumentException("Title is required.");

        // 1. Clean Title
        String cleanedTitle = request.getTitle().replaceAll("\\r?\\n", " ").trim();
        String title = cleanedTitle.length() > 255 ? cleanedTitle.substring(0, 252) + "..." : cleanedTitle;

        // 2. Fetch or Auto-Provision CorporateEntity
        String rawEntity = (request.getEntity() != null && !request.getEntity().isBlank()) ? request.getEntity() : "CK_INDIA";
        EntityCode entityCode = ExcelAliasResolverUtils.resolveEntityCode(rawEntity);
        CorporateEntity entity = corporateEntityRepository.findById(entityCode).orElseGet(() -> {
            CorporateEntity newEntity = CorporateEntity.builder()
                    .entityCode(entityCode)
                    .entityName("CK " + entityCode.name().replace("CK_", ""))
                    .build();
            return corporateEntityRepository.save(newEntity);
        });

        // 3. Fetch or Auto-Provision ProcessCategory
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

        // 4. Idempotency Check
        Optional<SopTemplate> existingOpt = sopTemplateRepository
                .findByEntityEntityCodeAndProcessCategoryIgnoreCaseAndTitleIgnoreCase(entityCode, normalizedCategory, title);
        boolean overwrite = Boolean.TRUE.equals(request.getOverwriteExisting());
        if (existingOpt.isPresent() && !overwrite) {
            throw new IllegalStateException(String.format(
                    "SOP Template already exists with code [%s] for entity '%s' and title '%s'. Pass 'overwriteExisting: true' to overwrite.",
                    existingOpt.get().getTemplateCode(), entityCode, title));
        }

        // 5. Parse Due Date
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
                    .frequency(freq).dueDayOffset(15).rawText(request.getFrequency()).build();
        } else {
            parsedRecurrence = DueDateParserUtils.ParsedRecurrence.builder()
                    .frequency(SopFrequency.MONTHLY).dueDayOffset(15).rawText("Monthly").build();
        }

        // 6. Resolve User IDs
        List<String> makerIds = (request.getMakerUserIds() != null && !request.getMakerUserIds().isEmpty()) 
                ? new ArrayList<>(request.getMakerUserIds()) : ExcelAliasResolverUtils.resolveMakerUserIds(request.getMaker());
        
        List<String> checkerIds = (request.getCheckerUserIds() != null && !request.getCheckerUserIds().isEmpty()) 
                ? new ArrayList<>(request.getCheckerUserIds()) : ExcelAliasResolverUtils.resolveCheckerUserIds(request.getChecker(), makerIds);

        String actId = (request.getActorId() != null && !request.getActorId().isBlank()) ? request.getActorId() : "usr-manoj-042";

        // 7. Auto-Provision Missing Users
        autoProvisionUserIfMissing(actId, UserRole.ADMIN, entity);
        for (String mId : makerIds) autoProvisionUserIfMissing(mId, UserRole.MAKER, entity);
        for (String cId : checkerIds) autoProvisionUserIfMissing(cId, UserRole.CHECKER, entity);

        // 8. Fetch the Creator
        User creator = userRepository.findById(actId).orElseGet(() -> userRepository.findFirstByOrderByCreatedAtAsc().orElse(null));
        if (creator == null) throw new IllegalStateException("Cannot create SOP template: no User record found.");

        // 9. Create or Update SOP Template
        SopTemplate template;
        boolean newlyCreated = false, isOverwritten = false;

        if (existingOpt.isPresent()) {
            template = existingOpt.get();
            template.setFrequency(parsedRecurrence.getFrequency());
            template.setRecurrenceConfig(parsedRecurrence.getRecurrenceConfigJson());
            template.setDueDayOffset(parsedRecurrence.getDueDayOffset());
            template.setDefaultMakerIds(new ArrayList<>(makerIds));
            template.setDefaultCheckerIds(new ArrayList<>(checkerIds));
            if (request.getEffectiveFrom() != null) template.setEffectiveFrom(request.getEffectiveFrom());
            isOverwritten = true;
        } else {
            String catPrefix = ExcelAliasResolverUtils.getCategoryCodePrefix(normalizedCategory);
            template = SopTemplate.builder()
                    .templateCode(generateUniqueTemplateCode(String.format("TPL-%s-%s", entityCode.name(), catPrefix)))
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

        // 10. Create or Update attached Task Template (WITH FIX FOR 255 CHAR LIMIT)
        StringBuilder taskDesc = new StringBuilder(cleanedTitle);
        if (request.getConsultantReview() != null && !request.getConsultantReview().isBlank()
                && !request.getConsultantReview().equalsIgnoreCase("NO") && !request.getConsultantReview().equalsIgnoreCase("N/A")) {
            taskDesc.append(" | External Reviewer: ").append(request.getConsultantReview().trim());
        }
        
        String finalTaskDesc = taskDesc.toString();
        if (finalTaskDesc.length() > 255) {
            finalTaskDesc = finalTaskDesc.substring(0, 252) + "...";
        }

        List<TaskTemplate> existingTasks = taskTemplateRepository.findBySopTemplate_TemplateIdOrderByStepSequenceAsc(savedTemplate.getTemplateId());
        TaskTemplate taskTemplate = !existingTasks.isEmpty() ? existingTasks.get(0) : TaskTemplate.builder().sopTemplate(savedTemplate).stepSequence(1).build();

        taskTemplate.setTaskName(title);
        taskTemplate.setDescription(finalTaskDesc); 
        taskTemplate.setDependencyMode("INDEPENDENT");
        taskTemplate.setPriority((request.getPriority() != null && !request.getPriority().isBlank()) ? request.getPriority() : "Medium");
        taskTemplate.setEtaStartDay(0);
        taskTemplate.setEtaEndDay(parsedRecurrence.getDueDayOffset());
        taskTemplate.setSlaHours((request.getSlaHours() != null && request.getSlaHours() > 0) ? request.getSlaHours() : 72);
        taskTemplate.setMakerIds(new ArrayList<>(makerIds));
        taskTemplate.setCheckerIds(new ArrayList<>(checkerIds));
        
        TaskTemplate savedTask = taskTemplateRepository.save(taskTemplate);

        // 11. Log Audit Trail (WITH FIX FOR 255 CHAR LIMIT)
        String auditComment = (newlyCreated ? "Created" : "Updated") + " single SOP template row: " + title;
        if (auditComment.length() > 255) {
            auditComment = auditComment.substring(0, 252) + "...";
        }
        logAuditTrail(savedTemplate, actId, newlyCreated ? "SINGLE_ROW_CREATE" : "SINGLE_ROW_UPDATE", auditComment);

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
                .message(String.format("SOP Template [%s] %s successfully.", savedTemplate.getTemplateCode(), newlyCreated ? "created" : "updated"))
                .build();
    }

    private void autoProvisionUserIfMissing(String userId, UserRole role, CorporateEntity entity) {
        if (!userRepository.existsById(userId)) {
            String rawName = userId.replace("usr-", "").replaceAll("-[0-9]+$", "");
            String formattedName = rawName.substring(0, 1).toUpperCase() + rawName.substring(1);
            
            User newUser = User.builder()
                    .userId(userId)
                    .fullName(formattedName + " (Auto-Provisioned)")
                    .email(rawName + "@cloudkaptan.com")
                    .role(role)
                    .entity(entity) 
                    .build();
                    
            userRepository.save(newUser);
            log.info("Auto-provisioned missing user: [{}] with role [{}] under entity [{}]", 
                     userId, role, entity.getEntityCode());
        }
    }

    private String generateUniqueTemplateCode(String baseCode) {
        String code = baseCode;
        int counter = 1;
        while (sopTemplateRepository.existsByTemplateCode(code)) {
            code = String.format("%s-%03d", baseCode, counter++);
        }
        return code;
    }

    private void logAuditTrail(SopTemplate template, String actorId, String action, String comment) {
        try {
            auditLogRepository.save(AuditLog.builder().actorId(actorId).action(action).entityType("SOP_TEMPLATE")
                    .entityId(template.getTemplateId().toString()).correlationId(comment).build());
            
            User actor = userRepository.findById(actorId).orElse(null);
            sopTemplateEventRepository.save(SopTemplateEvent.builder().sopTemplate(template).actor(actor).action(action)
                    .toStatus(template.getStatus()).comment(comment).build());
        } catch (Exception e) {
            log.warn("Failed to save audit log for template [{}]: {}", template.getTemplateId(), e.getMessage());
        }
    }
}
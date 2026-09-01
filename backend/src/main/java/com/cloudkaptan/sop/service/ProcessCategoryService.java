package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.ProcessCategoryDto;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.ProcessCategory;
import com.cloudkaptan.sop.entity.ProcessCategoryActivityLog;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.ProcessCategoryActivityLogRepository;
import com.cloudkaptan.sop.repository.ProcessCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessCategoryService {

    private final ProcessCategoryRepository categoryRepository;
    private final ProcessCategoryActivityLogRepository activityLogRepository;
    private final AuditLogRepository auditLogRepository;

    private static final List<ProcessCategoryDto> DEFAULT_CATEGORIES = List.of(
        new ProcessCategoryDto(null, "TAX_COMPLIANCE", "Tax Compliance", "Direct and Indirect Tax Reporting & Compliance"),
        new ProcessCategoryDto(null, "TREASURY_CASH", "Treasury & Cash Management", "Bank Reconciliations, Cash Flow Forecasting & Liquidity"),
        new ProcessCategoryDto(null, "FINANCIAL_REPORTING", "Financial Reporting", "GL Close, Balance Sheet & Financial Statements"),
        new ProcessCategoryDto(null, "FIXED_ASSETS", "Fixed Assets Management", "Capital Expenditure, Asset Depreciation & Verification"),
        new ProcessCategoryDto(null, "PAYROLL_STATUTORY", "Payroll & Statutory Compliance", "Payroll Processing, Provident Fund & Statutory Deductions"),
        new ProcessCategoryDto(null, "P2P", "Procure to Pay (P2P)", "Vendor Invoicing, PO Matching & Disbursements"),
        new ProcessCategoryDto(null, "O2C", "Order to Cash (O2C)", "Customer Invoicing, Receivables & Credit Management")
    );

    @Transactional
    public List<ProcessCategoryDto> getAllCategories() {
        List<ProcessCategory> list = categoryRepository.findAll();
        if (list.isEmpty()) {
            log.info("Seeding default process categories into database...");
            for (ProcessCategoryDto def : DEFAULT_CATEGORIES) {
                if (!categoryRepository.existsByCategoryCode(def.getCategoryCode())) {
                    categoryRepository.save(ProcessCategory.builder()
                        .categoryCode(def.getCategoryCode())
                        .categoryName(def.getCategoryName())
                        .description(def.getDescription())
                        .build());
                }
            }
            list = categoryRepository.findAll();
        }

        return list.stream().map(this::mapToDto).toList();
    }

    @Transactional
    public ProcessCategoryDto createCategory(ProcessCategoryDto dto) {
        String code = dto.getCategoryCode().trim();
        if (categoryRepository.existsByCategoryCode(code)) {
            throw new IllegalArgumentException("Process Category with code '" + code + "' already exists.");
        }

        ProcessCategory category = ProcessCategory.builder()
            .categoryCode(code)
            .categoryName(dto.getCategoryName().trim())
            .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
            .build();

        ProcessCategory saved = categoryRepository.save(category);

        // 1. Log to Dedicated Process Category Activity Log Table
        ProcessCategoryActivityLog catLog = ProcessCategoryActivityLog.builder()
            .categoryCode(saved.getCategoryCode())
            .action("CREATE_CATEGORY")
            .actorId("usr-manoj-042")
            .actorName("Manoj Agarwal")
            .details("Created process category '" + saved.getCategoryName() + "' (" + saved.getCategoryCode() + ")")
            .build();
        activityLogRepository.save(catLog);

        // 2. Log to Global System Audit Log Table
        AuditLog auditLog = AuditLog.builder()
            .actorId("usr-manoj-042")
            .action("CREATE_PROCESS_CATEGORY")
            .entityType("PROCESS_CATEGORY")
            .entityId(saved.getCategoryCode())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        log.info("Created new Process Category [{}]", saved.getCategoryCode());
        return mapToDto(saved);
    }

    @Transactional
    public ProcessCategoryDto updateCategoryFlexible(String identifier, ProcessCategoryDto dto) {
        ProcessCategory category = findCategoryByIdentifier(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("Process Category not found with identifier: " + identifier));

        if (dto.getCategoryName() != null && !dto.getCategoryName().isBlank()) {
            category.setCategoryName(dto.getCategoryName().trim());
        }
        if (dto.getDescription() != null) {
            category.setDescription(dto.getDescription().trim());
        }

        ProcessCategory updated = categoryRepository.save(category);

        // 1. Log to Dedicated Process Category Activity Log Table
        ProcessCategoryActivityLog catLog = ProcessCategoryActivityLog.builder()
            .categoryCode(updated.getCategoryCode())
            .action("UPDATE_CATEGORY")
            .actorId("usr-manoj-042")
            .actorName("Manoj Agarwal")
            .details("Updated process category '" + updated.getCategoryName() + "' (" + updated.getCategoryCode() + ")")
            .build();
        activityLogRepository.save(catLog);

        // 2. Log to Global System Audit Log Table
        AuditLog auditLog = AuditLog.builder()
            .actorId("usr-manoj-042")
            .action("UPDATE_PROCESS_CATEGORY")
            .entityType("PROCESS_CATEGORY")
            .entityId(updated.getCategoryCode())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        log.info("Updated Process Category [{}]", updated.getCategoryCode());
        return mapToDto(updated);
    }

    @Transactional
    public void deleteCategory(String identifier) {
        ProcessCategory category = findCategoryByIdentifier(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("Process Category not found with identifier: " + identifier));

        String code = category.getCategoryCode();
        categoryRepository.delete(category);

        // 1. Log to Dedicated Process Category Activity Log Table
        ProcessCategoryActivityLog catLog = ProcessCategoryActivityLog.builder()
            .categoryCode(code)
            .action("DELETE_CATEGORY")
            .actorId("usr-manoj-042")
            .actorName("Manoj Agarwal")
            .details("Deleted process category '" + code + "'")
            .build();
        activityLogRepository.save(catLog);

        // 2. Log to Global System Audit Log Table
        AuditLog auditLog = AuditLog.builder()
            .actorId("usr-manoj-042")
            .action("DELETE_PROCESS_CATEGORY")
            .entityType("PROCESS_CATEGORY")
            .entityId(code)
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        log.info("Deleted Process Category [{}]", code);
    }

    @Transactional(readOnly = true)
    public List<ProcessCategoryActivityLog> getActivityLogs(String identifier) {
        Optional<ProcessCategory> cat = findCategoryByIdentifier(identifier);
        String code = cat.map(ProcessCategory::getCategoryCode).orElse(identifier);
        return activityLogRepository.findByCategoryCodeOrderByTimestampDesc(code);
    }

    private Optional<ProcessCategory> findCategoryByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) return Optional.empty();
        String trimmed = identifier.trim();

        // 1. Try by UUID
        try {
            UUID uuid = UUID.fromString(trimmed);
            Optional<ProcessCategory> byId = categoryRepository.findById(uuid);
            if (byId.isPresent()) return byId;
        } catch (IllegalArgumentException ignored) {}

        // 2. Try by exact categoryCode
        Optional<ProcessCategory> byCode = categoryRepository.findByCategoryCode(trimmed);
        if (byCode.isPresent()) return byCode;

        // 3. Try case-insensitive matching on categoryCode or categoryName
        return categoryRepository.findAll().stream()
            .filter(c -> c.getCategoryCode().equalsIgnoreCase(trimmed) || c.getCategoryName().equalsIgnoreCase(trimmed))
            .findFirst();
    }

    private ProcessCategoryDto mapToDto(ProcessCategory entity) {
        return ProcessCategoryDto.builder()
            .id(entity.getId())
            .categoryCode(entity.getCategoryCode())
            .categoryName(entity.getCategoryName())
            .description(entity.getDescription())
            .build();
    }
}

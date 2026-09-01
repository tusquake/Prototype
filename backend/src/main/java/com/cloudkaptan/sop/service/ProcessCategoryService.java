package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.ProcessCategoryDto;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.ProcessCategory;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.ProcessCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessCategoryService {

    private final ProcessCategoryRepository categoryRepository;
    private final AuditLogRepository auditLogRepository;

    private static final List<ProcessCategoryDto> DEFAULT_CATEGORIES = List.of(
        new ProcessCategoryDto(null, "Tax Compliance", "Tax Compliance", "Direct and Indirect Tax Reporting & Compliance"),
        new ProcessCategoryDto(null, "Treasury & Cash Management", "Treasury & Cash Management", "Bank Reconciliations, Cash Flow Forecasting & Liquidity"),
        new ProcessCategoryDto(null, "Financial Reporting", "Financial Reporting", "GL Close, Balance Sheet & Financial Statements"),
        new ProcessCategoryDto(null, "Fixed Assets Management", "Fixed Assets Management", "Capital Expenditure, Asset Depreciation & Verification"),
        new ProcessCategoryDto(null, "Payroll & Statutory Compliance", "Payroll & Statutory Compliance", "Payroll Processing, Provident Fund & Statutory Deductions"),
        new ProcessCategoryDto(null, "Procure to Pay (P2P)", "Procure to Pay (P2P)", "Vendor Invoicing, PO Matching & Disbursements"),
        new ProcessCategoryDto(null, "Order to Cash (O2C)", "Order to Cash (O2C)", "Customer Invoicing, Receivables & Credit Management")
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
    public ProcessCategoryDto updateCategory(UUID id, ProcessCategoryDto dto) {
        ProcessCategory category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Process Category not found with ID: " + id));

        if (dto.getCategoryName() != null && !dto.getCategoryName().isBlank()) {
            category.setCategoryName(dto.getCategoryName().trim());
        }
        if (dto.getDescription() != null) {
            category.setDescription(dto.getDescription().trim());
        }

        ProcessCategory updated = categoryRepository.save(category);

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
    public void deleteCategory(String categoryCode) {
        ProcessCategory category = categoryRepository.findByCategoryCode(categoryCode)
            .orElseThrow(() -> new ResourceNotFoundException("Process Category not found with code: " + categoryCode));
        categoryRepository.delete(category);

        AuditLog auditLog = AuditLog.builder()
            .actorId("usr-manoj-042")
            .action("DELETE_PROCESS_CATEGORY")
            .entityType("PROCESS_CATEGORY")
            .entityId(categoryCode)
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        log.info("Deleted Process Category [{}]", categoryCode);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getActivityLogs(String categoryCode) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("PROCESS_CATEGORY", categoryCode);
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

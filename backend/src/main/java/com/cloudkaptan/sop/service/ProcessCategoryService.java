package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.ProcessCategoryDto;
import com.cloudkaptan.sop.entity.ProcessCategory;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.ProcessCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessCategoryService {

    private final ProcessCategoryRepository categoryRepository;

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
        log.info("Created new Process Category [{}]", saved.getCategoryCode());
        return mapToDto(saved);
    }

    @Transactional
    public void deleteCategory(String categoryCode) {
        ProcessCategory category = categoryRepository.findByCategoryCode(categoryCode)
            .orElseThrow(() -> new ResourceNotFoundException("Process Category not found with code: " + categoryCode));
        categoryRepository.delete(category);
        log.info("Deleted Process Category [{}]", categoryCode);
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

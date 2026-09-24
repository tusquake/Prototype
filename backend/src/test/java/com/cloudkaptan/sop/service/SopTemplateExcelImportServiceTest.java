package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.CreateSingleSopTemplateRowRequest;
import com.cloudkaptan.sop.dto.SingleTemplateResponseDto;
import com.cloudkaptan.sop.entity.*;
import com.cloudkaptan.sop.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SopTemplateExcelImportServiceTest {

    @Mock
    private SopTemplateRepository sopTemplateRepository;
    @Mock
    private TaskTemplateRepository taskTemplateRepository;
    @Mock
    private CorporateEntityRepository corporateEntityRepository;
    @Mock
    private ProcessCategoryRepository processCategoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private SopTemplateEventRepository sopTemplateEventRepository;

    @InjectMocks
    private SopTemplateExcelImportService service;

    private User dummyUser;

    @BeforeEach
    void setUp() {
        dummyUser = User.builder()
                .userId("usr-manoj-042")
                .fullName("Manoj Agarwal")
                .email("manoj@example.com")
                .role(UserRole.MAKER)
                .build();
    }

    @Test
    @DisplayName("Should create a single SOP + Task template row successfully")
    void testCreateSingleTemplateRow_Success() {
        CreateSingleSopTemplateRowRequest request = CreateSingleSopTemplateRowRequest.builder()
                .entity("India")
                .processCategory("GST")
                .title("108th Row - Monthly GST Filing")
                .dueDateText("20th of next month")
                .maker("Manoj and KPMG")
                .checker("Prayasa")
                .actorId("usr-manoj-042")
                .build();

        CorporateEntity indiaEntity = CorporateEntity.builder()
                .entityCode(EntityCode.CK_INDIA)
                .entityName("CK India")
                .build();

        ProcessCategory gstCat = ProcessCategory.builder()
                .id(UUID.randomUUID())
                .categoryCode("CAT-GST")
                .categoryName("GST")
                .build();

        when(corporateEntityRepository.findById(EntityCode.CK_INDIA)).thenReturn(Optional.of(indiaEntity));
        when(processCategoryRepository.findByCategoryNameIgnoreCase("GST")).thenReturn(Optional.of(gstCat));
        when(sopTemplateRepository.findByEntityEntityCodeAndProcessCategoryIgnoreCaseAndTitleIgnoreCase(
                eq(EntityCode.CK_INDIA), eq("GST"), anyString())).thenReturn(Optional.empty());
        when(userRepository.findById("usr-manoj-042")).thenReturn(Optional.of(dummyUser));

        UUID templateId = UUID.randomUUID();
        when(sopTemplateRepository.save(any(SopTemplate.class))).thenAnswer(invocation -> {
            SopTemplate t = invocation.getArgument(0);
            t.setTemplateId(templateId);
            return t;
        });

        UUID taskId = UUID.randomUUID();
        when(taskTemplateRepository.findBySopTemplate_TemplateIdOrderByStepSequenceAsc(any())).thenReturn(new ArrayList<>());
        when(taskTemplateRepository.save(any(TaskTemplate.class))).thenAnswer(invocation -> {
            TaskTemplate tt = invocation.getArgument(0);
            tt.setTaskTemplateId(taskId);
            return tt;
        });

        SingleTemplateResponseDto response = service.createSingleTemplateRow(request);

        assertNotNull(response);
        assertEquals(templateId, response.getTemplateId());
        assertTrue(response.isNewlyCreated());
        assertFalse(response.isOverwritten());
        assertEquals(EntityCode.CK_INDIA, response.getEntityCode());
        assertEquals("GST", response.getProcessCategory());
        assertEquals(SopTemplateStatus.ACTIVE, response.getStatus());
        assertEquals("usr-manoj-042", response.getCreatedById());
        verify(sopTemplateRepository, times(1)).save(any(SopTemplate.class));
        verify(taskTemplateRepository, times(1)).save(any(TaskTemplate.class));
    }

    @Test
    @DisplayName("Should throw IllegalStateException if template exists and overwrite is false")
    void testCreateSingleTemplateRow_DuplicateThrows() {
        CreateSingleSopTemplateRowRequest request = CreateSingleSopTemplateRowRequest.builder()
                .entity("India")
                .processCategory("GST")
                .title("108th Row - Monthly GST Filing")
                .overwriteExisting(false)
                .build();

        CorporateEntity indiaEntity = CorporateEntity.builder()
                .entityCode(EntityCode.CK_INDIA)
                .entityName("CK India")
                .build();

        ProcessCategory gstCat = ProcessCategory.builder()
                .id(UUID.randomUUID())
                .categoryCode("CAT-GST")
                .categoryName("GST")
                .build();

        SopTemplate existing = SopTemplate.builder()
                .templateId(UUID.randomUUID())
                .templateCode("TPL-CK_INDIA-GST-001")
                .title("108th Row - Monthly GST Filing")
                .build();

        when(corporateEntityRepository.findById(EntityCode.CK_INDIA)).thenReturn(Optional.of(indiaEntity));
        when(processCategoryRepository.findByCategoryNameIgnoreCase("GST")).thenReturn(Optional.of(gstCat));
        when(sopTemplateRepository.findByEntityEntityCodeAndProcessCategoryIgnoreCaseAndTitleIgnoreCase(
                eq(EntityCode.CK_INDIA), eq("GST"), anyString())).thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.createSingleTemplateRow(request));
        assertTrue(ex.getMessage().contains("already exists"));
    }
}

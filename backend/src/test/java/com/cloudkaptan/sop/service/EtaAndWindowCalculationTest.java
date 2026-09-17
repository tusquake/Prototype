package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.dto.SopTemplateDto;
import com.cloudkaptan.sop.dto.TaskTemplateDto;
import com.cloudkaptan.sop.entity.SopTemplate;
import com.cloudkaptan.sop.entity.TaskTemplate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class EtaAndWindowCalculationTest {

    @Test
    @DisplayName("Verify getEffectiveDueDayOffset for all SopFrequency types and custom override")
    void testEffectiveDueDayOffset() {
        LocalDate testDate = LocalDate.of(2026, 9, 16); // Sept 2026 has 30 days

        // Custom override takes precedence
        assertEquals(3, SopTemplateService.getEffectiveDueDayOffset(3, SopFrequency.WEEKLY, testDate));
        assertEquals(10, SopTemplateService.getEffectiveDueDayOffset(10, SopFrequency.MONTHLY, testDate));

        // Default window fallbacks when customOffset is null or 0
        assertEquals(1, SopTemplateService.getEffectiveDueDayOffset(null, SopFrequency.DAILY, testDate));
        assertEquals(7, SopTemplateService.getEffectiveDueDayOffset(null, SopFrequency.WEEKLY, testDate));
        assertEquals(30, SopTemplateService.getEffectiveDueDayOffset(null, SopFrequency.MONTHLY, testDate));
        assertEquals(91, SopTemplateService.getEffectiveDueDayOffset(null, SopFrequency.QUARTERLY, testDate));
        assertEquals(365, SopTemplateService.getEffectiveDueDayOffset(null, SopFrequency.ANNUAL, testDate));
    }

    @Test
    @DisplayName("Verify sequential calculatedStartDay and calculatedEndDay offsets across task template steps")
    void testSequentialTaskOffsets() {
        TaskTemplate step1 = TaskTemplate.builder()
                .taskTemplateId(UUID.randomUUID())
                .stepSequence(1)
                .taskName("Step 1: Draft Tax Form")
                .dependencyMode("INDEPENDENT")
                .etaStartDay(0)
                .etaEndDay(4) // 4 days duration
                .build();

        TaskTemplate step2 = TaskTemplate.builder()
                .taskTemplateId(UUID.randomUUID())
                .stepSequence(2)
                .taskName("Step 2: Review Tax Form")
                .dependencyMode("DEPENDENT_ON_PREVIOUS")
                .etaStartDay(0)
                .etaEndDay(4) // 4 days duration
                .build();

        TaskTemplate step3 = TaskTemplate.builder()
                .taskTemplateId(UUID.randomUUID())
                .stepSequence(3)
                .taskName("Step 3: Submit Tax Form")
                .dependencyMode("DEPENDENT_ON_PREVIOUS")
                .etaStartDay(0)
                .etaEndDay(2) // 2 days duration
                .build();

        SopTemplate template = SopTemplate.builder()
                .templateId(UUID.randomUUID())
                .templateCode("TMPL-TAX-01")
                .title("Tax Compliance SOP")
                .frequency(SopFrequency.MONTHLY)
                .dueDayOffset(null)
                .taskTemplates(List.of(step1, step2, step3))
                .build();

        SopTemplateService service = new SopTemplateService(null, null, null, null, null, null, null, null);
        SopTemplateDto dto = service.toDto(template);

        assertNotNull(dto);
        assertEquals(30, dto.getDueDayOffset()); // Sept month length = 30

        List<TaskTemplateDto> tasks = dto.getTaskTemplates();
        assertEquals(3, tasks.size());

        // Step 1: Day 0 to Day 4 (Duration = 4)
        assertEquals(0, tasks.get(0).getCalculatedStartDay());
        assertEquals(4, tasks.get(0).getCalculatedEndDay());

        // Step 2: Starts on Day 5 (calculatedEndDay + 1) to Day 9 (5 + 4 = 9)
        assertEquals(5, tasks.get(1).getCalculatedStartDay());
        assertEquals(9, tasks.get(1).getCalculatedEndDay());

        // Step 3: Starts on Day 10 (9 + 1) to Day 12 (10 + 2 = 12)
        assertEquals(10, tasks.get(2).getCalculatedStartDay());
        assertEquals(12, tasks.get(2).getCalculatedEndDay());
    }
}

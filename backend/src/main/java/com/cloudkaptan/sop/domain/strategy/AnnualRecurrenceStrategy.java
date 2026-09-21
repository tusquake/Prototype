package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
public class AnnualRecurrenceStrategy implements RecurrenceStrategy {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.ANNUAL;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        return String.format("FY-%d", date.getYear());
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int dayOfYear = Math.min(Math.max(1, dueDayOffset), date.lengthOfYear());
        return LocalDate.ofYearDay(date.getYear(), dayOfYear);
    }

    @Override
    public boolean isDueToday(LocalDate date, String recurrenceConfig) {
        if (recurrenceConfig == null || recurrenceConfig.isBlank()) {
            return date.getDayOfYear() == 1;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(recurrenceConfig);
            String monthOfYear = root.has("monthOfYear") ? root.get("monthOfYear").asText().trim().toUpperCase() : "JAN";
            int targetDay = root.has("dayOfMonth") ? root.get("dayOfMonth").asInt() : 1;

            String monthName = date.getMonth().name();
            String monthAbbr = monthName.substring(0, 3);

            boolean monthMatch = monthOfYear.equalsIgnoreCase(monthName) || monthOfYear.equalsIgnoreCase(monthAbbr);
            int lastDay = date.lengthOfMonth();
            int effectiveTargetDay = Math.min(targetDay, lastDay);

            return monthMatch && (date.getDayOfMonth() == effectiveTargetDay);
        } catch (Exception e) {
            log.warn("Failed to parse annual recurrenceConfig [{}]: {}", recurrenceConfig, e.getMessage());
        }
        return date.getDayOfYear() == 1;
    }
}

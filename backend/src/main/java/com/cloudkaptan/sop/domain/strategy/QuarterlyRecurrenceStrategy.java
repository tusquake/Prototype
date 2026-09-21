package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.IsoFields;

@Slf4j
@Component
public class QuarterlyRecurrenceStrategy implements RecurrenceStrategy {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.QUARTERLY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        int year = date.getYear();
        int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
        return String.format("%d-Q%d", year, quarter);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
        int firstMonthOfQuarter = (quarter - 1) * 3 + 1;
        LocalDate firstDayOfQuarter = LocalDate.of(date.getYear(), firstMonthOfQuarter, 1);
        return firstDayOfQuarter.plusDays(Math.max(0, dueDayOffset - 1));
    }

    @Override
    public boolean isDueToday(LocalDate date, String recurrenceConfig) {
        int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
        int firstMonthOfQuarter = (quarter - 1) * 3 + 1;

        if (recurrenceConfig == null || recurrenceConfig.isBlank()) {
            return date.getMonthValue() == firstMonthOfQuarter && date.getDayOfMonth() == 1;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(recurrenceConfig);
            int targetDay = root.has("dayOfMonth") ? root.get("dayOfMonth").asInt() : 1;
            int lastDay = date.lengthOfMonth();
            int effectiveTargetDay = Math.min(targetDay, lastDay);

            if (date.getDayOfMonth() != effectiveTargetDay) {
                return false;
            }

            if (root.has("months") && root.get("months").isArray()) {
                String monthName = date.getMonth().name();
                String monthAbbr = monthName.substring(0, 3);
                for (JsonNode node : root.get("months")) {
                    String val = node.asText().trim().toUpperCase();
                    if (val.equalsIgnoreCase(monthName) || val.equalsIgnoreCase(monthAbbr)) {
                        return true;
                    }
                }
                return false;
            } else {
                return date.getMonthValue() == firstMonthOfQuarter;
            }
        } catch (Exception e) {
            log.warn("Failed to parse quarterly recurrenceConfig [{}]: {}", recurrenceConfig, e.getMessage());
        }
        return date.getMonthValue() == firstMonthOfQuarter && date.getDayOfMonth() == 1;
    }
}

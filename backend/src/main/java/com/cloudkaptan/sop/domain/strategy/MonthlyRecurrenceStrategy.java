package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;

@Slf4j
@Component
public class MonthlyRecurrenceStrategy implements RecurrenceStrategy {

    private static final DateTimeFormatter PERIOD_FORMATTER = DateTimeFormatter.ofPattern("yyyy-'M'MM");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.MONTHLY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        return date.format(PERIOD_FORMATTER);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        LocalDate firstDay = date.with(TemporalAdjusters.firstDayOfMonth());
        int lastDayOfMonth = date.with(TemporalAdjusters.lastDayOfMonth()).getDayOfMonth();
        int targetDay = Math.min(Math.max(1, dueDayOffset), lastDayOfMonth);
        return firstDay.withDayOfMonth(targetDay);
    }

    @Override
    public boolean isDueToday(LocalDate date, String recurrenceConfig) {
        if (recurrenceConfig == null || recurrenceConfig.isBlank()) {
            return date.getDayOfMonth() == 1;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(recurrenceConfig);
            if (root.has("dayOfMonth")) {
                int targetDay = root.get("dayOfMonth").asInt();
                int lastDay = date.lengthOfMonth();
                int effectiveTargetDay = Math.min(targetDay, lastDay);
                return date.getDayOfMonth() == effectiveTargetDay;
            }
        } catch (Exception e) {
            log.warn("Failed to parse monthly recurrenceConfig [{}]: {}", recurrenceConfig, e.getMessage());
        }
        return date.getDayOfMonth() == 1;
    }
}

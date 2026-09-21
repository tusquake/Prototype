package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.Locale;

@Slf4j
@Component
public class WeeklyRecurrenceStrategy implements RecurrenceStrategy {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.WEEKLY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        WeekFields weekFields = WeekFields.of(Locale.getDefault());
        int weekNumber = date.get(weekFields.weekOfWeekBasedYear());
        int year = date.get(weekFields.weekBasedYear());
        String dayAbbr = date.getDayOfWeek().name().substring(0, 3);
        return String.format("%d-W%02d-%s", year, weekNumber, dayAbbr);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int targetDayOfWeek = Math.min(Math.max(1, dueDayOffset), 7);
        return date.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), targetDayOfWeek);
    }

    @Override
    public boolean isDueToday(LocalDate date, String recurrenceConfig) {
        if (recurrenceConfig == null || recurrenceConfig.isBlank()) {
            return true;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(recurrenceConfig);
            if (root.has("weekdays") && root.get("weekdays").isArray()) {
                String dayName = date.getDayOfWeek().name();
                String dayAbbr = dayName.substring(0, 3);
                for (JsonNode node : root.get("weekdays")) {
                    String val = node.asText().trim().toUpperCase();
                    if (val.equalsIgnoreCase(dayName) || val.equalsIgnoreCase(dayAbbr)) {
                        return true;
                    }
                }
                return false;
            }
        } catch (Exception e) {
            log.warn("Failed to parse weekly recurrenceConfig [{}]: {}", recurrenceConfig, e.getMessage());
        }
        return true;
    }
}

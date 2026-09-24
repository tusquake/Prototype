package com.cloudkaptan.sop.util;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.time.Month;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class DueDateParserUtils {

    @Data
    @Builder
    public static class ParsedRecurrence {
        private SopFrequency frequency;
        private String recurrenceConfigJson;
        private Integer dueDayOffset;
        private String rawText;
    }

    private static final Pattern DAY_PATTERN = Pattern.compile("(\\d{1,2})(?:st|nd|rd|th)?", Pattern.CASE_INSENSITIVE);

    public static ParsedRecurrence parseDueDate(String dueDateText, String sheetNameFallback) {
        String raw = dueDateText != null ? dueDateText.trim() : "";
        String textLower = raw.toLowerCase();

        SopFrequency frequency = resolveFallbackFrequency(sheetNameFallback);
        List<Integer> months = new ArrayList<>();
        Integer day = null;
        String mode = "STANDARD";

        // 1. Check month names in text
        for (Month m : Month.values()) {
            String monthName = m.name().toLowerCase();
            if (textLower.contains(monthName) || (monthName.length() >= 3 && textLower.contains(monthName.substring(0, 3)))) {
                if (!months.contains(m.getValue())) {
                    months.add(m.getValue());
                }
            }
        }
        Collections.sort(months);

        // 2. Extract day number if present
        Matcher dayMatcher = DAY_PATTERN.matcher(raw);
        if (dayMatcher.find()) {
            try {
                int parsedDay = Integer.parseInt(dayMatcher.group(1));
                if (parsedDay >= 1 && parsedDay <= 31) {
                    day = parsedDay;
                }
            } catch (Exception e) {
                // Ignore parse failure
            }
        }

        // 3. Resolve frequency and mode keywords
        if (textLower.contains("half yearly") || textLower.contains("semi-annual") || textLower.contains("half-yearly")) {
            frequency = SopFrequency.ANNUAL;
            mode = "HALF_YEARLY";
            if (months.isEmpty()) {
                months = List.of(6, 12);
            }
        } else if (textLower.contains("as and when") || textLower.contains("as & when") || textLower.contains("ongoing") || textLower.contains("adhoc") || textLower.contains("ad-hoc")) {
            frequency = SopFrequency.MONTHLY;
            mode = "AS_AND_WHEN";
        } else if (textLower.contains("quarter") || textLower.contains("quarterly")) {
            frequency = SopFrequency.QUARTERLY;
            mode = "QUARTERLY";
        } else if (months.size() > 1) {
            frequency = SopFrequency.QUARTERLY;
            mode = "MULTI_MONTH";
        } else if (!months.isEmpty() || textLower.contains("annually") || textLower.contains("annual") || textLower.contains("every year")) {
            frequency = SopFrequency.ANNUAL;
            mode = "ANNUAL";
        }

        // Build JSON recurrenceConfig string
        StringBuilder json = new StringBuilder("{");
        json.append("\"mode\":\"").append(mode).append("\"");
        if (day != null) {
            json.append(",\"day\":").append(day);
        }
        if (!months.isEmpty()) {
            json.append(",\"months\":").append(months.toString());
        }
        if (!raw.isBlank()) {
            json.append(",\"rawText\":\"").append(escapeJson(raw)).append("\"");
        }
        json.append("}");

        int defaultOffset = switch (frequency) {
            case DAILY -> 1;
            case WEEKLY -> 7;
            case MONTHLY -> 15;
            case QUARTERLY -> 30;
            case ANNUAL -> 30;
        };

        return ParsedRecurrence.builder()
                .frequency(frequency)
                .recurrenceConfigJson(json.toString())
                .dueDayOffset(defaultOffset)
                .rawText(raw)
                .build();
    }

    private static SopFrequency resolveFallbackFrequency(String sheetName) {
        if (sheetName == null) return SopFrequency.ANNUAL;
        String s = sheetName.trim().toLowerCase();
        if (s.contains("month")) return SopFrequency.MONTHLY;
        if (s.contains("quarter")) return SopFrequency.QUARTERLY;
        if (s.contains("annu") || s.contains("year")) return SopFrequency.ANNUAL;
        return SopFrequency.ANNUAL;
    }

    private static String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

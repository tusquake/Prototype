package com.cloudkaptan.sop.util;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DueDateParserUtilsTest {

    @Test
    @DisplayName("Parse multi-month quarterly date string")
    void testParseMultiMonthQuarterly() {
        String raw = "30th of July, october, January and April";
        DueDateParserUtils.ParsedRecurrence result = DueDateParserUtils.parseDueDate(raw, "Quarterly");

        assertEquals(SopFrequency.QUARTERLY, result.getFrequency());
        assertTrue(result.getRecurrenceConfigJson().contains("\"day\":30"));
        assertTrue(result.getRecurrenceConfigJson().contains("\"months\":[1, 4, 7, 10]"));
    }

    @Test
    @DisplayName("Parse ordinal annual date string")
    void testParseOrdinalAnnual() {
        String raw = "25th April every year";
        DueDateParserUtils.ParsedRecurrence result = DueDateParserUtils.parseDueDate(raw, "Annual");

        assertEquals(SopFrequency.ANNUAL, result.getFrequency());
        assertTrue(result.getRecurrenceConfigJson().contains("\"day\":25"));
        assertTrue(result.getRecurrenceConfigJson().contains("\"months\":[4]"));
    }

    @Test
    @DisplayName("Parse Half Yearly keyword")
    void testParseHalfYearly() {
        String raw = "Half Yearly";
        DueDateParserUtils.ParsedRecurrence result = DueDateParserUtils.parseDueDate(raw, "Annual");

        assertEquals(SopFrequency.ANNUAL, result.getFrequency());
        assertTrue(result.getRecurrenceConfigJson().contains("\"mode\":\"HALF_YEARLY\""));
        assertTrue(result.getRecurrenceConfigJson().contains("\"months\":[6, 12]"));
    }

    @Test
    @DisplayName("Parse As and when adhoc keyword")
    void testParseAsAndWhen() {
        String raw = "As and when";
        DueDateParserUtils.ParsedRecurrence result = DueDateParserUtils.parseDueDate(raw, "Monthly");

        assertEquals(SopFrequency.MONTHLY, result.getFrequency());
        assertTrue(result.getRecurrenceConfigJson().contains("\"mode\":\"AS_AND_WHEN\""));
    }

    @Test
    @DisplayName("Fallback to sheet name frequency when date cell is empty")
    void testSheetNameFallback() {
        DueDateParserUtils.ParsedRecurrence result = DueDateParserUtils.parseDueDate("", "Monthly");
        assertEquals(SopFrequency.MONTHLY, result.getFrequency());
    }
}

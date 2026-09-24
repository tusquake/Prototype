package com.cloudkaptan.sop.util;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExcelAliasResolverUtilsTest {

    @Test
    @DisplayName("Resolve entity typo CK Australlia to CK_AUSTRALIA")
    void testResolveEntityTypo() {
        assertEquals(EntityCode.CK_AUSTRALIA, ExcelAliasResolverUtils.resolveEntityCode("CK Australlia"));
        assertEquals(EntityCode.CK_AUSTRALIA, ExcelAliasResolverUtils.resolveEntityCode("CK Australia"));
        assertEquals(EntityCode.CK_INDIA, ExcelAliasResolverUtils.resolveEntityCode("CK India"));
        assertEquals(EntityCode.CK_US, ExcelAliasResolverUtils.resolveEntityCode("CK US"));
        assertEquals(EntityCode.CK_UK, ExcelAliasResolverUtils.resolveEntityCode("CK UK"));
    }

    @Test
    @DisplayName("Normalize process category formatting and alias variations")
    void testNormalizeCategory() {
        assertEquals("Record to report", ExcelAliasResolverUtils.normalizeCategory("Order to Cash "));
        assertEquals("Record to report", ExcelAliasResolverUtils.normalizeCategory("Record to report"));
        assertEquals("Compliance - FEMA", ExcelAliasResolverUtils.normalizeCategory("FEMA"));
        assertEquals("Compliance - Direct tax", ExcelAliasResolverUtils.normalizeCategory("Direct tax"));
    }

    @Test
    @DisplayName("Enforce SoD when Maker equals Checker")
    void testSoDEnforcementWhenMakerEqualsChecker() {
        List<String> makers = ExcelAliasResolverUtils.resolveMakerUserIds("Prayasa");
        List<String> checkers = ExcelAliasResolverUtils.resolveCheckerUserIds("Prayasa", makers);

        assertTrue(makers.contains("usr-prayasa-410"));
        assertTrue(checkers.contains("usr-prayasa-410"));
        assertTrue(checkers.contains("usr-manoj-042"), "Secondary checker must be added for SoD compliance");
    }

    @Test
    @DisplayName("Resolve external firm names to partner IDs")
    void testResolveExternalFirms() {
        List<String> checkers = ExcelAliasResolverUtils.resolveCheckerUserIds("KPMG (Audit)", List.of("usr-prayasa-410"));
        assertTrue(checkers.contains("usr-kpmg-ext-01"));
    }
}

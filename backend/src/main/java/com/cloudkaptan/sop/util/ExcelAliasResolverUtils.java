package com.cloudkaptan.sop.util;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

@Slf4j
public class ExcelAliasResolverUtils {

    public static EntityCode resolveEntityCode(String input) {
        if (input == null || input.isBlank()) return EntityCode.CK_INDIA;
        String s = input.trim().toUpperCase();

        if (s.contains("AUSTRALLIA") || s.contains("AUSTRALIA") || s.contains("CK_AU")) {
            return EntityCode.CK_AUSTRALIA;
        }
        if (s.contains("INDIA") || s.contains("CK_IN")) {
            return EntityCode.CK_INDIA;
        }
        if (s.contains("UNITED KINGDOM") || s.contains("UK") || s.contains("CK_UK")) {
            return EntityCode.CK_UK;
        }
        if (s.contains("UNITED STATES") || s.matches(".*\\bUS\\b.*") || s.contains("CK_US")) {
            return EntityCode.CK_US;
        }

        return EntityCode.CK_INDIA;
    }

    public static String normalizeCategory(String input) {
        if (input == null || input.isBlank()) return "General Compliance";
        String trimmed = input.trim();
        String lower = trimmed.toLowerCase();

        if (lower.contains("order to cash")) return "Record to report";
        if (lower.contains("record to report")) return "Record to report";
        if (lower.equals("fema")) return "Compliance - FEMA";
        if (lower.equals("direct tax")) return "Compliance - Direct tax";
        if (lower.equals("indirect tax")) return "Compliance - Indirect tax";
        if (lower.equals("secretarial")) return "Compliance - Secretarial";

        return trimmed;
    }

    public static String getCategoryCodePrefix(String categoryName) {
        if (categoryName == null) return "CMP";
        String lower = categoryName.toLowerCase();
        if (lower.contains("direct tax")) return "TAX-DIR";
        if (lower.contains("indirect tax")) return "TAX-IND";
        if (lower.contains("secretarial")) return "SEC";
        if (lower.contains("fema")) return "FEMA";
        if (lower.contains("payroll")) return "PAY";
        if (lower.contains("record to report")) return "RTR";
        if (lower.contains("overseas")) return "OVC";
        if (lower.contains("risk")) return "RSK";

        String cleaned = categoryName.replaceAll("[^a-zA-Z]", "").toUpperCase();
        return cleaned.length() >= 3 ? cleaned.substring(0, 3) : "CMP";
    }

    public static List<String> resolveMakerUserIds(String cellText) {
        List<String> userIds = resolveUserIdsFromText(cellText);
        return userIds.isEmpty() ? List.of("usr-prayasa-410") : userIds;
    }

    public static List<String> resolveCheckerUserIds(String cellText, List<String> makerUserIds) {
        List<String> userIds = new ArrayList<>(resolveUserIdsFromText(cellText));
        if (userIds.isEmpty()) {
            userIds.add("usr-prishita-102");
        }
        // Enforce SoD: Maker cannot be sole Checker
        boolean isSameAsMaker = !makerUserIds.isEmpty() && new HashSet<>(makerUserIds).equals(new HashSet<>(userIds));
        if (isSameAsMaker) {
            log.info("SoD Enforcement: Maker equals Checker for text [{}]. Appending secondary Checker [usr-manoj-042].", cellText);
            if (!userIds.contains("usr-manoj-042")) {
                userIds.add("usr-manoj-042");
            }
        }
        return userIds;
    }

    private static List<String> resolveUserIdsFromText(String cellText) {
        if (cellText == null || cellText.isBlank()) return List.of();
        String text = cellText.trim();
        List<String> results = new ArrayList<>();

        String lower = text.toLowerCase();
        if (lower.contains("prayasa")) results.add("usr-prayasa-410");
        if (lower.contains("prishita")) results.add("usr-prishita-102");
        if (lower.contains("manoj")) results.add("usr-manoj-042");
        if (lower.contains("it")) results.add("usr-it-101");
        if (lower.contains("kpmg")) results.add("usr-kpmg-ext-01");
        if (lower.contains("legalogic") || lower.contains("cs")) results.add("usr-legalogic-ext-02");
        if (lower.contains("hr") || lower.contains("admin") || lower.contains("ca") || lower.contains("du heads")) results.add("usr-hr-admin-03");
        if (lower.contains("mazars") || lower.contains("knav") || lower.contains("mks") || lower.contains("calibre")) results.add("usr-audit-partner-04");

        return results.stream().distinct().toList();
    }
}

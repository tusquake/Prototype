package com.cloudkaptan.sop.domain.enums;

import java.time.LocalDate;
import java.time.ZoneId;

public enum EntityCode {
    CK_INDIA,
    CK_US,
    CK_UK,
    CK_AUSTRALIA;

    public ZoneId getTimeZone() {
        return switch (this) {
            case CK_INDIA -> ZoneId.of("Asia/Kolkata");      // IST (UTC+5:30)
            case CK_US -> ZoneId.of("America/New_York");     // EST/EDT (UTC-5/-4)
            case CK_UK -> ZoneId.of("Europe/London");        // GMT/BST (UTC+0/+1)
            case CK_AUSTRALIA -> ZoneId.of("Australia/Sydney"); // AEST/AEDT (UTC+10/+11)
        };
    }

    public LocalDate getCurrentLocalDate() {
        return LocalDate.now(getTimeZone());
    }
}

package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;

@Component
public class MonthlyRecurrenceStrategy implements RecurrenceStrategy {

    private static final DateTimeFormatter PERIOD_FORMATTER = DateTimeFormatter.ofPattern("yyyy-'M'MM");

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
}

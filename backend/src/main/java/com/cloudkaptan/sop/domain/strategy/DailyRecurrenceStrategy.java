package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
public class DailyRecurrenceStrategy implements RecurrenceStrategy {

    private static final DateTimeFormatter PERIOD_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.DAILY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        return date.format(PERIOD_FORMATTER);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        return date;
    }
}

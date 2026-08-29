package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.Locale;

@Component
public class WeeklyRecurrenceStrategy implements RecurrenceStrategy {

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.WEEKLY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        WeekFields weekFields = WeekFields.of(Locale.getDefault());
        int weekNumber = date.get(weekFields.weekOfWeekBasedYear());
        int year = date.get(weekFields.weekBasedYear());
        return String.format("%d-W%02d", year, weekNumber);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int targetDayOfWeek = Math.min(Math.max(1, dueDayOffset), 7);
        return date.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), targetDayOfWeek);
    }
}

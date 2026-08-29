package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.IsoFields;

@Component
public class QuarterlyRecurrenceStrategy implements RecurrenceStrategy {

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.QUARTERLY;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        int year = date.getYear();
        int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
        return String.format("%d-Q%d", year, quarter);
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
        int firstMonthOfQuarter = (quarter - 1) * 3 + 1;
        LocalDate firstDayOfQuarter = LocalDate.of(date.getYear(), firstMonthOfQuarter, 1);
        return firstDayOfQuarter.plusDays(Math.max(0, dueDayOffset - 1));
    }
}

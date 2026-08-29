package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class AnnualRecurrenceStrategy implements RecurrenceStrategy {

    @Override
    public SopFrequency getFrequency() {
        return SopFrequency.ANNUAL;
    }

    @Override
    public String calculatePeriodKey(LocalDate date) {
        return String.format("FY-%d", date.getYear());
    }

    @Override
    public LocalDate calculateDueDate(LocalDate date, int dueDayOffset) {
        int dayOfYear = Math.min(Math.max(1, dueDayOffset), date.lengthOfYear());
        return LocalDate.ofYearDay(date.getYear(), dayOfYear);
    }
}

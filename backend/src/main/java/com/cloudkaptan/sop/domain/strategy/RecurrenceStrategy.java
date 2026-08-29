package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;

import java.time.LocalDate;

public interface RecurrenceStrategy {

    SopFrequency getFrequency();

    String calculatePeriodKey(LocalDate date);

    LocalDate calculateDueDate(LocalDate date, int dueDayOffset);
}

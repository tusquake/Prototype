package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.DemoSettingsDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
public class DemoRuntimeSettingsService {

    private final AtomicBoolean autoInstantiateOnApproval = new AtomicBoolean(false);
    private final AtomicBoolean bypassRecurrenceCheck = new AtomicBoolean(false);
    private final AtomicReference<LocalDate> forcedExecutionDate = new AtomicReference<>(null);

    public boolean isAutoInstantiateOnApprovalEnabled() {
        return autoInstantiateOnApproval.get();
    }

    public boolean isBypassRecurrenceCheckEnabled() {
        return bypassRecurrenceCheck.get();
    }

    public LocalDate getEffectiveDate(LocalDate defaultDate) {
        LocalDate forced = forcedExecutionDate.get();
        return forced != null ? forced : defaultDate;
    }

    public DemoSettingsDto getCurrentSettings() {
        return DemoSettingsDto.builder()
                .autoInstantiateOnApproval(autoInstantiateOnApproval.get())
                .bypassRecurrenceCheck(bypassRecurrenceCheck.get())
                .forcedExecutionDate(forcedExecutionDate.get())
                .build();
    }

    public DemoSettingsDto updateSettings(DemoSettingsDto update) {
        if (update.getAutoInstantiateOnApproval() != null) {
            autoInstantiateOnApproval.set(update.getAutoInstantiateOnApproval());
            log.info("[Demo Runtime Settings] autoInstantiateOnApproval updated to [{}]", update.getAutoInstantiateOnApproval());
        }
        if (update.getBypassRecurrenceCheck() != null) {
            bypassRecurrenceCheck.set(update.getBypassRecurrenceCheck());
            log.info("[Demo Runtime Settings] bypassRecurrenceCheck updated to [{}]", update.getBypassRecurrenceCheck());
        }
        if (update.getForcedExecutionDate() != null) {
            forcedExecutionDate.set(update.getForcedExecutionDate());
            log.info("[Demo Runtime Settings] forcedExecutionDate updated to [{}]", update.getForcedExecutionDate());
        }
        return getCurrentSettings();
    }

    public void resetSettings() {
        autoInstantiateOnApproval.set(false);
        bypassRecurrenceCheck.set(false);
        forcedExecutionDate.set(null);
        log.info("[Demo Runtime Settings] Reset runtime flags to default production values.");
    }
}

package com.cloudkaptan.sop.repository.projection;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public interface TaskInboxView {

    UUID getTaskId();

    String getRecordNo();

    String getSopTitle();

    String getSopCode();

    String getProcessCategory();

    EntityCode getEntityCode();

    String getPeriodKey();

    String getMakerId();

    String getMakerName();

    String getCheckerId();

    String getCheckerName();

    TaskStatus getStatus();

    LocalDate getDueDate();

    OffsetDateTime getCompletedAt();

    OffsetDateTime getApprovedAt();
}

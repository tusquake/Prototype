package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.entity.TaskOutbox;
import com.cloudkaptan.sop.repository.TaskOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OutboxDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcherService.class);

    private final TaskOutboxRepository taskOutboxRepository;

    @Scheduled(fixedDelay = 10000) // Polls small indexed task_outbox table every 10s
    @Transactional
    public void dispatchPendingOutboxRows() {
        List<TaskOutbox> pendingRows = taskOutboxRepository.findPendingOutboxRows();
        if (pendingRows.isEmpty()) {
            return;
        }

        log.info("Found {} pending outbox row(s) to dispatch.", pendingRows.size());
        for (TaskOutbox row : pendingRows) {
            try {
                // Emulates GCP Cloud Tasks dispatching or enqueuing
                log.info("Dispatching outbox row [{}] for SOP Version [{}] period [{}] kind [{}] scheduled for [{}]",
                        row.getOutboxId(), row.getSopVersion().getSop().getSopCode(), row.getPeriodKey(), row.getKind(), row.getScheduleTime());

                row.setDispatchedAt(OffsetDateTime.now());
                row.setDispatchAttempts(row.getDispatchAttempts() + 1);
                taskOutboxRepository.save(row);
            } catch (Exception e) {
                log.error("Failed to dispatch outbox row [{}]: {}", row.getOutboxId(), e.getMessage(), e);
                row.setDispatchAttempts(row.getDispatchAttempts() + 1);
                taskOutboxRepository.save(row);
            }
        }
    }
}

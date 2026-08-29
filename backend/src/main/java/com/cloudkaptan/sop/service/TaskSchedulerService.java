package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategy;
import com.cloudkaptan.sop.domain.strategy.RecurrenceStrategyFactory;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.repository.SopRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskSchedulerService {

    private final SopRepository sopRepository;
    private final TaskRepository taskRepository;
    private final RecurrenceStrategyFactory recurrenceStrategyFactory;

    @Scheduled(cron = "${app.task-scheduler.cron:0 0 0 * * ?}")
    @Transactional
    public void generateScheduledTasks() {
        log.info("Executing scheduled task generation engine...");
        LocalDate today = LocalDate.now();
        List<Sop> activeSops = sopRepository.findByStatus(SopStatus.ACTIVE);

        int generatedCount = 0;
        for (Sop sop : activeSops) {
            try {
                RecurrenceStrategy strategy = recurrenceStrategyFactory.getStrategy(sop.getFrequency());
                String periodKey = strategy.calculatePeriodKey(today);

                if (!taskRepository.existsBySop_SopIdAndPeriodKey(sop.getSopId(), periodKey)) {
                    LocalDate dueDate = strategy.calculateDueDate(today, sop.getDueDayOffset());
                    String recordNo = String.format("%s-%s", sop.getSopCode(), periodKey);

                    Task task = Task.builder()
                        .sop(sop)
                        .recordNo(recordNo)
                        .periodKey(periodKey)
                        .entity(sop.getEntity())
                        .maker(sop.getDefaultMaker())
                        .checker(sop.getDefaultChecker())
                        .status(TaskStatus.OPEN)
                        .dueDate(dueDate)
                        .build();

                    taskRepository.save(task);
                    generatedCount++;
                    log.info("Generated Task [{}] for SOP [{}] and Period [{}]", recordNo, sop.getSopCode(), periodKey);
                }
            } catch (Exception e) {
                log.error("Failed to generate task for SOP [{}]: {}", sop.getSopCode(), e.getMessage(), e);
            }
        }
        log.info("Scheduled task generation completed. Idempotently created [{}] new tasks.", generatedCount);
    }
}

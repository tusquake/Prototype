package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.entity.SopTemplate;
import com.cloudkaptan.sop.repository.SopTemplateRepository;
import com.cloudkaptan.sop.service.TaskSchedulerService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/finsop/v1/internal/tasks")
@RequiredArgsConstructor
public class TaskWorkerController {

    private final SopTemplateRepository sopTemplateRepository;
    private final TaskSchedulerService taskSchedulerService;

    @PostMapping("/process-single-template")
    public ResponseEntity<Void> processSingleTemplate(@RequestBody TemplateTaskPayload request) {
        log.info("Cloud Task Worker triggered for Template ID [{}] on [{}]", 
                request.getTemplateId(), request.getExecutionDate());

        SopTemplate template = sopTemplateRepository.findById(request.getTemplateId()).orElse(null);
        
        if (template != null) {
            try {
                // Generate the SOP, Tasks, Audit Logs, and Notifications for this specific template
                taskSchedulerService.instantiateSingleSopTemplate(template, request.getExecutionDate());
            } catch (Exception e) {
                log.error("Error processing template [{}] in worker: {}", request.getTemplateId(), e.getMessage(), e);
                // Return 500 so Cloud Tasks automatically retries this specific template later
                return ResponseEntity.internalServerError().build();
            }
        } else {
            log.warn("Template ID [{}] not found during worker execution. Skipping.", request.getTemplateId());
        }

        // Return 200 OK so Cloud Tasks marks this specific job as completed and deletes it from the queue
        return ResponseEntity.ok().build();
    }

    @Data
    public static class TemplateTaskPayload {
        private UUID templateId;
        private LocalDate executionDate;
    }
}
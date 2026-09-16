package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.dto.CreateSopTemplateRequest;
import com.cloudkaptan.sop.dto.CreateTaskTemplateRequest;
import com.cloudkaptan.sop.dto.SopTemplateDto;
import com.cloudkaptan.sop.dto.TaskTemplateDto;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.entity.SopTemplate;
import com.cloudkaptan.sop.entity.TaskTemplate;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import com.cloudkaptan.sop.repository.SopTemplateRepository;
import com.cloudkaptan.sop.repository.TaskTemplateRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SopTemplateService {

    private final SopTemplateRepository sopTemplateRepository;
    private final TaskTemplateRepository taskTemplateRepository;
    private final CorporateEntityRepository corporateEntityRepository;
    private final UserRepository userRepository;
    private final UserCategoryPermissionService categoryPermissionService;
    private final NotificationPublisherService notificationPublisherService;

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE / UPDATE TEMPLATE (Step 1 draft save)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public SopTemplateDto createTemplate(CreateSopTemplateRequest request) {
        if (sopTemplateRepository.existsByTemplateCode(request.getTemplateCode())) {
            throw new IllegalArgumentException("Template code already exists: " + request.getTemplateCode());
        }

        CorporateEntity entity = corporateEntityRepository.findById(request.getEntityCode())
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + request.getEntityCode()));

        User createdBy = userRepository.findById(request.getCreatedById())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + request.getCreatedById()));

        SopTemplate template = SopTemplate.builder()
                .templateCode(request.getTemplateCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .processCategory(request.getProcessCategory())
                .entity(entity)
                .frequency(request.getFrequency())
                .isRecurring(Boolean.TRUE.equals(request.getIsRecurring()))
                .recurrenceConfig(request.getRecurrenceConfig())
                .dueDayOffset(request.getDueDayOffset() != null ? request.getDueDayOffset() : 0)
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveUntil(request.getEffectiveUntil())
                .status(SopTemplateStatus.DRAFT)
                .defaultMakerIds(request.getDefaultMakerIds())
                .defaultCheckerIds(request.getDefaultCheckerIds())
                .createdBy(createdBy)
                .build();

        // Inline task templates if provided in single-shot request
        if (request.getTaskTemplates() != null && !request.getTaskTemplates().isEmpty()) {
            for (int i = 0; i < request.getTaskTemplates().size(); i++) {
                CreateTaskTemplateRequest taskReq = request.getTaskTemplates().get(i);
                TaskTemplate taskTemplate = buildTaskTemplateEntity(taskReq, template, i + 1);
                template.getTaskTemplates().add(taskTemplate);
            }
        }

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Created SOP Template [{}] with ID [{}] — status=DRAFT", saved.getTemplateCode(), saved.getTemplateId());
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto updateTemplate(UUID templateId, CreateSopTemplateRequest request) {
        SopTemplate template = getTemplateOrThrow(templateId);

        if (template.getStatus() == SopTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Cannot modify an ACTIVE template. Retire it first.");
        }

        CorporateEntity entity = corporateEntityRepository.findById(request.getEntityCode())
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + request.getEntityCode()));

        template.setTitle(request.getTitle());
        template.setDescription(request.getDescription());
        template.setProcessCategory(request.getProcessCategory());
        template.setEntity(entity);
        template.setFrequency(request.getFrequency());
        template.setIsRecurring(Boolean.TRUE.equals(request.getIsRecurring()));
        template.setRecurrenceConfig(request.getRecurrenceConfig());
        template.setDueDayOffset(request.getDueDayOffset() != null ? request.getDueDayOffset() : 0);
        template.setEffectiveFrom(request.getEffectiveFrom());
        template.setEffectiveUntil(request.getEffectiveUntil());
        template.setDefaultMakerIds(request.getDefaultMakerIds());
        template.setDefaultCheckerIds(request.getDefaultCheckerIds());

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Updated SOP Template [{}]", saved.getTemplateId());
        return toDto(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TASK TEMPLATE MANAGEMENT (Step 2 incremental draft save)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public SopTemplateDto addTaskTemplate(UUID templateId, CreateTaskTemplateRequest request) {
        SopTemplate template = getTemplateOrThrow(templateId);
        if (template.getStatus() == SopTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Cannot add task steps to an ACTIVE template.");
        }

        int nextSequence = template.getTaskTemplates().size() + 1;
        TaskTemplate taskTemplate = buildTaskTemplateEntity(request, template, nextSequence);
        template.getTaskTemplates().add(taskTemplate);

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Added task step [{}] to SOP Template [{}]", nextSequence, templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto updateTaskTemplate(UUID templateId, UUID taskTemplateId, CreateTaskTemplateRequest request) {
        getTemplateOrThrow(templateId); // validate template exists
        TaskTemplate task = taskTemplateRepository.findById(taskTemplateId)
                .orElseThrow(() -> new IllegalArgumentException("Task template not found: " + taskTemplateId));

        task.setTaskName(request.getTaskName());
        task.setDescription(request.getDescription());
        task.setDependencyMode(request.getDependencyMode() != null ? request.getDependencyMode() : task.getDependencyMode());
        task.setPriority(request.getPriority() != null ? request.getPriority() : task.getPriority());
        task.setEtaStartDay(request.getEtaStartDay());
        task.setEtaEndDay(request.getEtaEndDay());
        task.setSlaHours(request.getSlaHours() != null ? request.getSlaHours() : task.getSlaHours());
        task.setMakerIds(request.getMakerIds());
        task.setCheckerIds(request.getCheckerIds());
        task.setRequiredDocumentNames(request.getRequiredDocumentNames());

        taskTemplateRepository.save(task);
        SopTemplate template = getTemplateOrThrow(templateId);
        log.info("Updated task template [{}] on SOP Template [{}]", taskTemplateId, templateId);
        return toDto(template);
    }

    @Transactional
    public SopTemplateDto deleteTaskTemplate(UUID templateId, UUID taskTemplateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        if (template.getStatus() == SopTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Cannot remove task steps from an ACTIVE template.");
        }

        template.getTaskTemplates().removeIf(t -> t.getTaskTemplateId().equals(taskTemplateId));

        // Re-sequence remaining tasks
        for (int i = 0; i < template.getTaskTemplates().size(); i++) {
            template.getTaskTemplates().get(i).setStepSequence(i + 1);
        }

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Deleted task template [{}] from SOP Template [{}] — re-sequenced remaining steps", taskTemplateId, templateId);
        return toDto(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE TRANSITIONS (Step 3 — submit for approval & activation)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public SopTemplateDto transitionStatus(UUID templateId, String action, String actorId, String comment) {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("Lifecycle action parameter is required (SUBMIT, ACTIVATE, DEACTIVATE, REJECT)");
        }
        return switch (action.toUpperCase().trim()) {
            case "SUBMIT", "PENDING_APPROVAL" -> submitForApproval(templateId, actorId);
            case "ACTIVATE", "ACTIVE" -> activateTemplate(templateId);
            case "DEACTIVATE", "DEACTIVATED" -> deactivateTemplate(templateId);
            case "REJECT", "REJECTED" -> rejectTemplate(templateId, comment);
            default -> throw new IllegalArgumentException("Unsupported lifecycle action: " + action + ". Supported actions: SUBMIT, ACTIVATE, DEACTIVATE, REJECT.");
        };
    }

    @Transactional
    public SopTemplateDto submitForApproval(UUID templateId, String actorId) {
        SopTemplate template = getTemplateOrThrow(templateId);

        if (template.getTaskTemplates().isEmpty()) {
            throw new IllegalStateException("Cannot submit a template for approval with no task steps defined.");
        }
        if (template.getDefaultMakerIds().isEmpty() || template.getDefaultCheckerIds().isEmpty()) {
            throw new IllegalStateException("Cannot submit a template without at least one Maker and one Checker assigned.");
        }

        template.setStatus(SopTemplateStatus.PENDING_APPROVAL);
        SopTemplate saved = sopTemplateRepository.save(template);

        try {
            com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto catAssignments = categoryPermissionService.getCategoryAssignments(template.getProcessCategory());
            List<String> approvers = (catAssignments != null && catAssignments.getApproverUserIds() != null && !catAssignments.getApproverUserIds().isEmpty())
                    ? catAssignments.getApproverUserIds()
                    : List.of("usr-vivek-108");

            for (String approverId : approvers) {
                notificationPublisherService.publishNotification(com.cloudkaptan.sop.dto.NotificationEventDto.builder()
                        .recipientUserId(approverId)
                        .eventType("SOP_SUBMITTED")
                        .title("SOP Template Approval Required")
                        .message("SOP Blueprint '" + saved.getTitle() + "' (" + saved.getTemplateCode() + ") has been submitted for approval.")
                        .referenceEntityType("SOP_TEMPLATE")
                        .referenceEntityId(saved.getTemplateId().toString())
                        .build());
            }
        } catch (Exception e) {
            log.warn("Failed to publish approval notifications for SOP template [{}]: {}", templateId, e.getMessage());
        }

        log.info("Submitted SOP Template [{}] for approval — status=PENDING_APPROVAL", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto activateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);

        if (template.getStatus() == SopTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Template is already ACTIVE.");
        }
        if (template.getTaskTemplates().isEmpty()) {
            throw new IllegalStateException("Cannot activate a template with no task steps defined.");
        }
        if (template.getDefaultMakerIds().isEmpty() || template.getDefaultCheckerIds().isEmpty()) {
            throw new IllegalStateException("Cannot activate a template without at least one Maker and one Checker assigned.");
        }

        template.setStatus(SopTemplateStatus.ACTIVE);
        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Activated SOP Template [{}] — scheduler will now generate SOP instances from this template", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto deactivateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        template.setStatus(SopTemplateStatus.DEACTIVATED);
        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Deactivated SOP Template [{}]", templateId);
        return toDto(saved);
    }



    @Transactional
    public SopTemplateDto rejectTemplate(UUID templateId, String comment) {
        SopTemplate template = getTemplateOrThrow(templateId);
        template.setStatus(SopTemplateStatus.REJECTED);
        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Rejected SOP Template [{}] with comment: {}", templateId, comment);
        return toDto(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SopTemplateDto getById(UUID templateId) {
        return toDto(getTemplateOrThrow(templateId));
    }

    @Transactional(readOnly = true)
    public List<SopTemplateDto> getAllTemplates() {
        return sopTemplateRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SopTemplateDto> getByStatus(SopTemplateStatus status) {
        return sopTemplateRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private SopTemplate getTemplateOrThrow(UUID templateId) {
        return sopTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("SOP Template not found: " + templateId));
    }

    private TaskTemplate buildTaskTemplateEntity(CreateTaskTemplateRequest req, SopTemplate parent, int sequence) {
        String depMode = (req.getDependencyMode() != null)
                ? req.getDependencyMode()
                : (sequence == 1 ? "INDEPENDENT" : "DEPENDENT_ON_PREVIOUS");

        List<String> makers = (req.getMakerIds() != null) ? new ArrayList<>(req.getMakerIds()) : new ArrayList<>();
        List<String> checkers = (req.getCheckerIds() != null) ? new ArrayList<>(req.getCheckerIds()) : new ArrayList<>();
        List<String> docs = (req.getRequiredDocumentNames() != null) ? new ArrayList<>(req.getRequiredDocumentNames()) : new ArrayList<>();

        return TaskTemplate.builder()
                .sopTemplate(parent)
                .stepSequence(sequence)
                .taskName(req.getTaskName())
                .description(req.getDescription())
                .dependencyMode(depMode)
                .priority(req.getPriority() != null ? req.getPriority() : "Medium")
                .etaStartDay(req.getEtaStartDay() != null ? req.getEtaStartDay() : 0)
                .etaEndDay(req.getEtaEndDay() != null ? req.getEtaEndDay() : 7)
                .slaHours(req.getSlaHours() != null ? req.getSlaHours() : 24)
                .makerIds(makers)
                .checkerIds(checkers)
                .requiredDocumentNames(docs)
                .build();
    }

    public SopTemplateDto toDto(SopTemplate t) {
        List<TaskTemplateDto> taskDtos = t.getTaskTemplates().stream()
                .map(this::toTaskDto)
                .collect(Collectors.toList());

        return SopTemplateDto.builder()
                .templateId(t.getTemplateId())
                .templateCode(t.getTemplateCode())
                .title(t.getTitle())
                .description(t.getDescription())
                .processCategory(t.getProcessCategory())
                .entityCode(t.getEntity() != null ? t.getEntity().getEntityCode().name() : null)
                .frequency(t.getFrequency())
                .isRecurring(t.getIsRecurring())
                .recurrenceConfig(t.getRecurrenceConfig())
                .dueDayOffset(t.getDueDayOffset())
                .effectiveFrom(t.getEffectiveFrom())
                .effectiveUntil(t.getEffectiveUntil())
                .status(t.getStatus())
                .defaultMakerIds(t.getDefaultMakerIds())
                .defaultCheckerIds(t.getDefaultCheckerIds())
                .taskTemplates(taskDtos)
                .createdById(t.getCreatedBy() != null ? t.getCreatedBy().getUserId() : null)
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    public TaskTemplateDto toTaskDto(TaskTemplate tt) {
        return TaskTemplateDto.builder()
                .taskTemplateId(tt.getTaskTemplateId())
                .templateId(tt.getSopTemplate() != null ? tt.getSopTemplate().getTemplateId() : null)
                .stepSequence(tt.getStepSequence())
                .taskName(tt.getTaskName())
                .description(tt.getDescription())
                .dependencyMode(tt.getDependencyMode())
                .priority(tt.getPriority())
                .etaStartDay(tt.getEtaStartDay())
                .etaEndDay(tt.getEtaEndDay())
                .slaHours(tt.getSlaHours())
                .makerIds(tt.getMakerIds())
                .checkerIds(tt.getCheckerIds())
                .requiredDocumentNames(tt.getRequiredDocumentNames())
                .createdAt(tt.getCreatedAt())
                .updatedAt(tt.getUpdatedAt())
                .build();
    }
}

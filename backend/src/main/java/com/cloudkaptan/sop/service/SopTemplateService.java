package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.domain.state.soptemplate.SopTemplateContext;
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

    @Transactional
    public SopTemplateDto createTemplate(CreateSopTemplateRequest request) {
        if (sopTemplateRepository.existsByTemplateCode(request.getTemplateCode())) {
            throw new IllegalArgumentException("SOP Template code already exists: " + request.getTemplateCode());
        }

        CorporateEntity entity = (request.getEntityCode() != null)
                ? corporateEntityRepository.findById(request.getEntityCode()).orElse(null)
                : null;

        User creator = (request.getCreatedById() != null)
                ? userRepository.findById(request.getCreatedById()).orElse(null)
                : null;

        SopTemplate template = SopTemplate.builder()
                .templateCode(request.getTemplateCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .processCategory(request.getProcessCategory())
                .entity(entity)
                .frequency(request.getFrequency())
                .dueDayOffset(request.getDueDayOffset() != null ? request.getDueDayOffset() : 15)
                .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : true)
                .recurrenceConfig(request.getRecurrenceConfig())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveUntil(request.getEffectiveUntil())
                .createdBy(creator)
                .status(SopTemplateStatus.DRAFT)
                .defaultMakerIds(request.getDefaultMakerIds() != null ? request.getDefaultMakerIds() : new ArrayList<>())
                .defaultCheckerIds(request.getDefaultCheckerIds() != null ? request.getDefaultCheckerIds() : new ArrayList<>())
                .build();

        if (request.getTaskTemplates() != null && !request.getTaskTemplates().isEmpty()) {
            int seq = 1;
            for (CreateTaskTemplateRequest taskReq : request.getTaskTemplates()) {
                TaskTemplate taskTemplate = buildTaskTemplateEntity(taskReq, template, seq++);
                template.getTaskTemplates().add(taskTemplate);
            }
        }

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Created SOP Template [{}] ({}) in DRAFT status", saved.getTemplateCode(), saved.getTemplateId());
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto updateTemplate(UUID templateId, CreateSopTemplateRequest request) {
        SopTemplate template = getTemplateOrThrow(templateId);

        if (template.getStatus() == SopTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Cannot edit a template while it is ACTIVE. Deactivate it first.");
        }

        if (request.getTitle() != null) template.setTitle(request.getTitle());
        if (request.getDescription() != null) template.setDescription(request.getDescription());
        if (request.getProcessCategory() != null) template.setProcessCategory(request.getProcessCategory());
        if (request.getFrequency() != null) template.setFrequency(request.getFrequency());
        if (request.getDueDayOffset() != null) template.setDueDayOffset(request.getDueDayOffset());
        if (request.getIsRecurring() != null) template.setIsRecurring(request.getIsRecurring());
        if (request.getRecurrenceConfig() != null) template.setRecurrenceConfig(request.getRecurrenceConfig());
        if (request.getEffectiveFrom() != null) template.setEffectiveFrom(request.getEffectiveFrom());
        if (request.getEffectiveUntil() != null) template.setEffectiveUntil(request.getEffectiveUntil());
        if (request.getDefaultMakerIds() != null) template.setDefaultMakerIds(request.getDefaultMakerIds());
        if (request.getDefaultCheckerIds() != null) template.setDefaultCheckerIds(request.getDefaultCheckerIds());

        if (request.getEntityCode() != null) {
            corporateEntityRepository.findById(request.getEntityCode())
                    .ifPresent(template::setEntity);
        }

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Updated SOP Template [{}]", saved.getTemplateId());
        return toDto(saved);
    }

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
        getTemplateOrThrow(templateId);
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

        for (int i = 0; i < template.getTaskTemplates().size(); i++) {
            template.getTaskTemplates().get(i).setStepSequence(i + 1);
        }

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Deleted task template [{}] from SOP Template [{}]", taskTemplateId, templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto transitionStatus(UUID templateId, String action, String actorId, String comment) {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("Lifecycle action parameter is required");
        }
        return switch (action.toUpperCase().trim()) {
            case "SUBMIT", "PENDING_APPROVAL" -> submitForApproval(templateId, actorId);
            case "ACTIVATE", "ACTIVE" -> activateTemplate(templateId);
            case "DEACTIVATE", "DEACTIVATED" -> deactivateTemplate(templateId);
            case "REJECT", "REJECTED" -> rejectTemplate(templateId, comment);
            default -> throw new IllegalArgumentException("Unsupported lifecycle action: " + action);
        };
    }

    @Transactional
    public SopTemplateDto submitForApproval(UUID templateId, String actorId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.submitForApproval(actorId);

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

        log.info("Submitted SOP Template [{}] for approval", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto activateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.approve();

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Activated SOP Template [{}]", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto deactivateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.deactivate();

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Deactivated SOP Template [{}]", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto rejectTemplate(UUID templateId, String comment) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.reject(comment);

        SopTemplate saved = sopTemplateRepository.save(template);
        log.info("Rejected SOP Template [{}] with comment: {}", templateId, comment);
        return toDto(saved);
    }

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

    public SopTemplateDto toDto(SopTemplate template) {
        String entityCodeStr = (template.getEntity() != null && template.getEntity().getEntityCode() != null)
                ? template.getEntity().getEntityCode().name()
                : null;

        List<TaskTemplateDto> taskDtos = (template.getTaskTemplates() != null)
                ? template.getTaskTemplates().stream().map(this::toTaskDto).collect(Collectors.toList())
                : new ArrayList<>();

        String createdByIdStr = (template.getCreatedBy() != null) ? template.getCreatedBy().getUserId() : null;

        return SopTemplateDto.builder()
                .templateId(template.getTemplateId())
                .templateCode(template.getTemplateCode())
                .title(template.getTitle())
                .description(template.getDescription())
                .processCategory(template.getProcessCategory())
                .entityCode(entityCodeStr)
                .frequency(template.getFrequency())
                .dueDayOffset(template.getDueDayOffset())
                .isRecurring(template.getIsRecurring())
                .recurrenceConfig(template.getRecurrenceConfig())
                .effectiveFrom(template.getEffectiveFrom())
                .effectiveUntil(template.getEffectiveUntil())
                .status(template.getStatus())
                .createdById(createdByIdStr)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .defaultMakerIds(template.getDefaultMakerIds())
                .defaultCheckerIds(template.getDefaultCheckerIds())
                .taskTemplates(taskDtos)
                .build();
    }

    private TaskTemplateDto toTaskDto(TaskTemplate task) {
        return TaskTemplateDto.builder()
                .taskTemplateId(task.getTaskTemplateId())
                .stepSequence(task.getStepSequence())
                .taskName(task.getTaskName())
                .description(task.getDescription())
                .dependencyMode(task.getDependencyMode())
                .priority(task.getPriority())
                .etaStartDay(task.getEtaStartDay())
                .etaEndDay(task.getEtaEndDay())
                .slaHours(task.getSlaHours())
                .makerIds(task.getMakerIds())
                .checkerIds(task.getCheckerIds())
                .requiredDocumentNames(task.getRequiredDocumentNames())
                .build();
    }
}
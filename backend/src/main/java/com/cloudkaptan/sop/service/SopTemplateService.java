package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.SopTemplateStatus;
import com.cloudkaptan.sop.domain.state.soptemplate.SopTemplateContext;
import com.cloudkaptan.sop.dto.AuditLogDto;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopFrequency;
import com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto;
import com.cloudkaptan.sop.dto.NotificationEventDto;
import com.cloudkaptan.sop.dto.TaskEventDto;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.SopTemplateEvent;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.SopTemplateEventRepository;

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
    private final TaskSchedulerService taskSchedulerService;
    private final AuditLogRepository auditLogRepository;
    private final SopTemplateEventRepository sopTemplateEventRepository;


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
        logTemplateAudit(saved, request.getCreatedById(), "CREATE_TEMPLATE", "Created SOP Template blueprint in DRAFT status");
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
        logTemplateAudit(saved, null, "UPDATE_TEMPLATE", "Updated SOP Template blueprint settings");
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
        logTemplateAudit(saved, null, "ADD_TASK_TEMPLATE", "Added task step blueprint sequence " + nextSequence + " (" + request.getTaskName() + ")");
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
        task.setRequiredDocuments(request.getRequiredDocuments());

        taskTemplateRepository.save(task);
        SopTemplate template = getTemplateOrThrow(templateId);
        logTemplateAudit(template, null, "UPDATE_TASK_TEMPLATE", "Updated task step blueprint: " + task.getTaskName());
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
        logTemplateAudit(saved, null, "DELETE_TASK_TEMPLATE", "Removed task step blueprint from SOP Template");
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
            CategoryAccessAssignmentDto catAssignments = categoryPermissionService.getCategoryAssignments(template.getProcessCategory());
            List<String> approvers = (catAssignments != null && catAssignments.getApproverUserIds() != null && !catAssignments.getApproverUserIds().isEmpty())
                    ? catAssignments.getApproverUserIds()
                    : List.of("usr-vivek-108");

            for (String approverId : approvers) {
                notificationPublisherService.publishNotification(NotificationEventDto.builder()
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

        logTemplateAudit(saved, actorId, "SUBMIT_FOR_APPROVAL", "Submitted SOP Template blueprint for category approval");
        log.info("Submitted SOP Template [{}] for approval", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto activateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.approve();

        SopTemplate saved = sopTemplateRepository.save(template);
        logTemplateAudit(saved, null, "APPROVE_TEMPLATE", "Approved and Activated SOP Template blueprint");
        log.info("Activated SOP Template [{}]", templateId);

        // Automatically spawn SOP Instance & Task Instances immediately upon approval!
        try {
            taskSchedulerService.instantiateSingleSopTemplate(saved, java.time.LocalDate.now());
        } catch (Exception e) {
            log.warn("Auto-instantiation on template approval failed for template [{}]: {}", templateId, e.getMessage());
        }

        return toDto(saved);
    }

    @Transactional
    public void instantiateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        logTemplateAudit(template, null, "INSTANTIATE_TEMPLATE", "Manually triggered SOP instance generation");
        taskSchedulerService.instantiateSingleSopTemplate(template, java.time.LocalDate.now());
    }

    @Transactional
    public SopTemplateDto deactivateTemplate(UUID templateId) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.deactivate();

        SopTemplate saved = sopTemplateRepository.save(template);
        logTemplateAudit(saved, null, "DEACTIVATE_TEMPLATE", "Deactivated SOP Template blueprint");
        log.info("Deactivated SOP Template [{}]", templateId);
        return toDto(saved);
    }

    @Transactional
    public SopTemplateDto rejectTemplate(UUID templateId, String comment) {
        SopTemplate template = getTemplateOrThrow(templateId);
        SopTemplateContext context = new SopTemplateContext(template);
        context.reject(comment);

        SopTemplate saved = sopTemplateRepository.save(template);
        logTemplateAudit(saved, null, "REJECT_TEMPLATE", comment != null ? comment : "Rejected SOP Template blueprint");
        log.info("Rejected SOP Template [{}]", templateId);
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
    public Page<SopTemplateDto> getAllTemplates(Pageable pageable) {
        return sopTemplateRepository.findAll(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<SopTemplateDto> getFilteredTemplates(SopTemplateStatus status,
                                                    java.util.List<EntityCode> entities,
                                                    String category,
                                                    SopFrequency frequency,
                                                    String search,
                                                    Pageable pageable) {
        List<SopTemplate> templates = sopTemplateRepository.findAll();
        List<SopTemplateDto> filtered = templates.stream()
                .filter(t -> {
                    if (status != null && t.getStatus() != status) return false;
                    if (entities != null && !entities.isEmpty() && (t.getEntity() == null || !entities.contains(t.getEntity().getEntityCode()))) return false;
                    if (category != null && !category.isBlank() && !category.equalsIgnoreCase(t.getProcessCategory())) return false;
                    if (frequency != null && t.getFrequency() != frequency) return false;
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        boolean matchTitle = t.getTitle() != null && t.getTitle().toLowerCase().contains(q);
                        boolean matchCode = t.getTemplateCode() != null && t.getTemplateCode().toLowerCase().contains(q);
                        if (!matchTitle && !matchCode) return false;
                    }
                    return true;
                })
                .map(this::toDto)
                .toList();

        int start = (int) pageable.getOffset();
        if (start >= filtered.size()) {
            return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, filtered.size());
        }
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new org.springframework.data.domain.PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    @Transactional(readOnly = true)
    public List<SopTemplateDto> getByStatus(SopTemplateStatus status) {
        return sopTemplateRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<SopTemplateDto> getByStatus(SopTemplateStatus status, Pageable pageable) {
        return sopTemplateRepository.findByStatusOrderByCreatedAtDesc(status, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> getTemplateAuditLogs(UUID templateId, Pageable pageable) {
        SopTemplate template = getTemplateOrThrow(templateId);
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("SOP_TEMPLATE", template.getTemplateId().toString(), pageable)
                .map(a -> {
                    String actorName = userRepository.findById(a.getActorId())
                            .map(User::getFullName)
                            .orElse(a.getActorId());
                    String actorEmail = userRepository.findById(a.getActorId())
                            .map(User::getEmail)
                            .orElse("");
                    return AuditLogDto.builder()
                            .auditId(a.getAuditId())
                            .actorId(a.getActorId())
                            .actorName(actorName)
                            .actorEmail(actorEmail)
                            .action(a.getAction())
                            .entityType(a.getEntityType())
                            .entityId(a.getEntityId())
                            .correlationId(a.getCorrelationId())
                            .timestamp(a.getTimestamp())
                            .build();
                });
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
        List<com.cloudkaptan.sop.dto.RequiredDocument> docs = (req.getRequiredDocuments() != null) ? new ArrayList<>(req.getRequiredDocuments()) : new ArrayList<>();

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
                .requiredDocuments(docs)
                .build();
    }

    public static int getEffectiveDueDayOffset(Integer customOffset, SopFrequency frequency, java.time.LocalDate startDate) {
        if (customOffset != null && customOffset > 0) {
            return customOffset;
        }
        if (frequency == null) {
            return 15;
        }
        java.time.LocalDate start = (startDate != null) ? startDate : java.time.LocalDate.now();
        return switch (frequency) {
            case DAILY -> 1;
            case WEEKLY -> 7;
            case MONTHLY -> (int) java.time.temporal.ChronoUnit.DAYS.between(start, start.plusMonths(1));
            case QUARTERLY -> (int) java.time.temporal.ChronoUnit.DAYS.between(start, start.plusMonths(3));
            case ANNUAL -> (int) java.time.temporal.ChronoUnit.DAYS.between(start, start.plusYears(1));
        };
    }

    public SopTemplateDto toDto(SopTemplate template) {
        String entityCodeStr = (template.getEntity() != null && template.getEntity().getEntityCode() != null)
                ? template.getEntity().getEntityCode().name()
                : null;

        List<TaskTemplateDto> taskDtos = new ArrayList<>();
        if (template.getTaskTemplates() != null && !template.getTaskTemplates().isEmpty()) {
            List<TaskTemplate> sorted = template.getTaskTemplates().stream()
                    .sorted(java.util.Comparator.comparingInt(TaskTemplate::getStepSequence))
                    .toList();

            int lastCalculatedEndDay = -1;

            for (int i = 0; i < sorted.size(); i++) {
                TaskTemplate tt = sorted.get(i);
                int startDay;
                if (i == 0 || "INDEPENDENT".equalsIgnoreCase(tt.getDependencyMode()) || tt.getStepSequence() == 1) {
                    startDay = (tt.getEtaStartDay() != null) ? tt.getEtaStartDay() : 0;
                } else {
                    startDay = lastCalculatedEndDay + 1;
                }

                int duration = (tt.getEtaEndDay() != null && tt.getEtaEndDay() > (tt.getEtaStartDay() != null ? tt.getEtaStartDay() : 0))
                        ? (tt.getEtaEndDay() - (tt.getEtaStartDay() != null ? tt.getEtaStartDay() : 0))
                        : ((tt.getSlaHours() != null && tt.getSlaHours() / 24 > 0) ? tt.getSlaHours() / 24 : 4);

                int endDay = startDay + duration;
                lastCalculatedEndDay = endDay;

                TaskTemplateDto taskDto = toTaskDto(tt);
                taskDto.setCalculatedStartDay(startDay);
                taskDto.setCalculatedEndDay(endDay);
                taskDtos.add(taskDto);
            }
        }

        String createdByIdStr = (template.getCreatedBy() != null) ? template.getCreatedBy().getUserId() : null;

        List<String> approverIds = new ArrayList<>();
        List<String> approverNames = new ArrayList<>();
        try {
            CategoryAccessAssignmentDto catAssignments = categoryPermissionService.getCategoryAssignments(template.getProcessCategory());
            if (catAssignments != null && catAssignments.getApproverUserIds() != null && !catAssignments.getApproverUserIds().isEmpty()) {
                approverIds.addAll(catAssignments.getApproverUserIds());
            } else {
                approverIds.add("usr-vivek-108");
            }
            for (String uid : approverIds) {
                userRepository.findById(uid).ifPresentOrElse(
                        u -> approverNames.add(u.getFullName()),
                        () -> approverNames.add(uid)
                );
            }
        } catch (Exception e) {
            log.warn("Could not fetch category approvers for template [{}]: {}", template.getTemplateId(), e.getMessage());
        }

        List<TaskEventDto> historyList = new ArrayList<>();
        try {
            List<SopTemplateEvent> events = sopTemplateEventRepository
                    .findBySopTemplate_TemplateIdOrderByTimestampDesc(template.getTemplateId());
            if (events != null && !events.isEmpty()) {
                for (SopTemplateEvent e : events) {
                    String actorName = (e.getActor() != null) ? e.getActor().getFullName() : "System";
                    String actorIdStr = (e.getActor() != null) ? e.getActor().getUserId() : null;
                    historyList.add(TaskEventDto.builder()
                            .eventId(e.getEventId())
                            .actorId(actorIdStr)
                            .actorName(actorName)
                            .action(e.getAction())
                            .comment(e.getComment())
                            .timestamp(e.getTimestamp())
                            .build());
                }
            } else {
                List<AuditLog> audits = auditLogRepository
                        .findByEntityTypeAndEntityIdOrderByTimestampDesc("SOP_TEMPLATE", template.getTemplateId().toString());
                for (AuditLog a : audits) {
                    String actorName = userRepository.findById(a.getActorId())
                            .map(User::getFullName)
                            .orElse(a.getActorId());
                    historyList.add(TaskEventDto.builder()
                            .eventId(0L)
                            .actorId(a.getActorId())
                            .actorName(actorName)
                            .action(a.getAction())
                            .comment(a.getCorrelationId())
                            .timestamp(a.getTimestamp())
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load audit history for template [{}]: {}", template.getTemplateId(), e.getMessage());
        }

        int effectiveDueDayOffset = getEffectiveDueDayOffset(template.getDueDayOffset(), template.getFrequency(), template.getEffectiveFrom());

        return SopTemplateDto.builder()
                .templateId(template.getTemplateId())
                .templateCode(template.getTemplateCode())
                .title(template.getTitle())
                .description(template.getDescription())
                .processCategory(template.getProcessCategory())
                .entityCode(entityCodeStr)
                .frequency(template.getFrequency())
                .dueDayOffset(effectiveDueDayOffset)
                .isRecurring(template.getIsRecurring())
                .recurrenceConfig(template.getRecurrenceConfig())
                .effectiveFrom(template.getEffectiveFrom())
                .effectiveUntil(template.getEffectiveUntil())
                .status(template.getStatus())
                .createdById(createdByIdStr)
                .assignedApproverIds(approverIds)
                .assignedApproverNames(approverNames)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .defaultMakerIds(template.getDefaultMakerIds())
                .defaultCheckerIds(template.getDefaultCheckerIds())
                .taskTemplates(taskDtos)
                .history(historyList)
                .build();
    }

    private void logTemplateAudit(SopTemplate template, String actorId, String action, String comment) {
        try {
            String actId = (actorId != null && !actorId.isBlank())
                    ? actorId
                    : (template.getCreatedBy() != null ? template.getCreatedBy().getUserId() : "usr-manoj-042");

            auditLogRepository.save(AuditLog.builder()
                    .actorId(actId)
                    .action(action)
                    .entityType("SOP_TEMPLATE")
                    .entityId(template.getTemplateId().toString())
                    .correlationId(comment != null ? comment : UUID.randomUUID().toString())
                    .build());

            User actor = userRepository.findById(actId).orElse(null);
            sopTemplateEventRepository.save(SopTemplateEvent.builder()
                    .sopTemplate(template)
                    .actor(actor)
                    .action(action)
                    .toStatus(template.getStatus())
                    .comment(comment)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to log template audit for [{}]: {}", template.getTemplateId(), e.getMessage());
        }
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
                .requiredDocuments(task.getRequiredDocuments())
                .build();
    }
}
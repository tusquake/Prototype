package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.ApplyRowLevelSecurity;
import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.domain.state.sop.SopContext;
import com.cloudkaptan.sop.domain.state.sop.SopStateMachineFactory;
import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import com.cloudkaptan.sop.repository.SopRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class SopService {

    private final SopRepository sopRepository;
    private final CorporateEntityRepository entityRepository;
    private final UserRepository userRepository;
    private final TaskSchedulerService taskSchedulerService;
    private final AuditLogRepository auditLogRepository;

    @ApplyRowLevelSecurity
    @Transactional(readOnly = true)
    public List<SopDto> getSops(List<EntityCode> entities) {
        List<Sop> sops = (entities == null || entities.isEmpty())
            ? sopRepository.findAll()
            : sopRepository.findByEntityIn(entities);

        return sops.stream()
            .map(this::mapToDto)
            .toList();
    }

    @Transactional
    public SopDto createSop(CreateSopRequest request) {
        if (sopRepository.findBySopCode(request.getSopCode()).isPresent()) {
            throw new IllegalArgumentException("SOP code already exists: " + request.getSopCode());
        }

        CorporateEntity entity = resolveEntity(request.getEntityCode());
        User createdBy = resolveUser(request.getCreatedById(), UserRole.ADMIN, entity);

        List<String> mPool = (request.getDefaultMakerIds() != null && !request.getDefaultMakerIds().isEmpty())
            ? request.getDefaultMakerIds() : List.of(request.getDefaultMakerId() != null ? request.getDefaultMakerId() : "usr-tushar-304");
        List<String> cPool = (request.getDefaultCheckerIds() != null && !request.getDefaultCheckerIds().isEmpty())
            ? request.getDefaultCheckerIds() : List.of(request.getDefaultCheckerId() != null ? request.getDefaultCheckerId() : "usr-vivek-108");

        Boolean isRec = Boolean.TRUE.equals(request.getIsRecurring());

        Sop sop = Sop.builder()
            .sopCode(request.getSopCode())
            .title(request.getTitle())
            .description(request.getDescription())
            .processCategory(request.getProcessCategory())
            .entity(entity)
            .frequency(request.getFrequency())
            .dueDayOffset(request.getDueDayOffset())
            .isRecurring(isRec)
            .defaultMakerIds(new java.util.ArrayList<>(mPool))
            .defaultCheckerIds(new java.util.ArrayList<>(cPool))
            .status(SopStatus.ACTIVE)
            .createdBy(createdBy)
            .build();

        Sop saved = sopRepository.save(sop);

        AuditLog auditLog = AuditLog.builder()
            .actorId(createdBy.getUserId())
            .action("CREATE_SOP")
            .entityType("SOP")
            .entityId(saved.getSopCode())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        // Automatically trigger scheduler engine to create task for the new SOP
        try {
            taskSchedulerService.generateScheduledTasks();
        } catch (Exception e) {
            // Non-fatal if scheduler runs concurrently
        }

        return mapToDto(saved);
    }

    @Transactional
    public SopDto assignSop(AssignSopRequest request) {
        if (sopRepository.findBySopCode(request.getSopCode()).isPresent()) {
            throw new IllegalArgumentException("SOP code already exists: " + request.getSopCode());
        }

        CorporateEntity entity = resolveEntity(request.getEntityCode());
        User adminCreator = resolveUser("usr-manoj-042", UserRole.ADMIN, entity);

        Sop sop = Sop.builder()
            .sopCode(request.getSopCode())
            .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle() : "Pending SOP Draft - " + request.getSopCode())
            .description("SOP assigned by Admin. Pending drafting by assigned creator.")
            .processCategory(request.getProcessCategory()) // Fixed process category set by Admin!
            .entity(entity)
            .frequency(com.cloudkaptan.sop.domain.enums.SopFrequency.MONTHLY)
            .dueDayOffset(15)
            .isRecurring(false)
            .assignedCreatorId(request.getAssignedCreatorId())
            .assignedApproverId(request.getAssignedApproverId())
            .status(SopStatus.PENDING_CREATION)
            .createdBy(adminCreator)
            .version(1)
            .build();

        Sop saved = sopRepository.save(sop);
        return mapToDto(saved);
    }

    @Transactional
    public SopDto submitSop(UUID sopId, SubmitSopRequest request) {
        Sop sop = getSopOrThrow(sopId);
        User actor = resolveUser(request.getActorId(), UserRole.MAKER, sop.getEntity());

        SopContext context = new SopContext(sop, SopStateMachineFactory.getState(sop.getStatus()));
        context.submitForApproval(actor);

        if (request.getTitle() != null && !request.getTitle().isBlank()) sop.setTitle(request.getTitle());
        if (request.getDescription() != null) sop.setDescription(request.getDescription());
        if (request.getFrequency() != null) sop.setFrequency(request.getFrequency());
        if (request.getDueDayOffset() != null) sop.setDueDayOffset(request.getDueDayOffset());
        if (request.getIsRecurring() != null) sop.setIsRecurring(request.getIsRecurring());
        if (request.getDefaultMakerIds() != null && !request.getDefaultMakerIds().isEmpty()) sop.setDefaultMakerIds(request.getDefaultMakerIds());
        if (request.getDefaultCheckerIds() != null && !request.getDefaultCheckerIds().isEmpty()) sop.setDefaultCheckerIds(request.getDefaultCheckerIds());

        Sop saved = sopRepository.save(sop);
        return mapToDto(saved);
    }

    @Transactional
    public SopDto actionSop(UUID sopId, SopActionRequest request) {
        Sop sop = getSopOrThrow(sopId);
        User actor = resolveUser(request.getActorId(), UserRole.CHECKER, sop.getEntity());

        SopContext context = new SopContext(sop, SopStateMachineFactory.getState(sop.getStatus()));

        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            context.approve(actor);
            taskSchedulerService.generateScheduledTasks();
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            context.reject(actor, request.getComment());
        } else {
            throw new IllegalArgumentException("Invalid action: " + request.getAction() + ". Expected APPROVE or REJECT.");
        }

        Sop saved = sopRepository.save(sop);
        return mapToDto(saved);
    }

    private Sop getSopOrThrow(UUID sopId) {
        return sopRepository.findById(sopId)
            .orElseThrow(() -> new ResourceNotFoundException("SOP not found with ID: " + sopId));
    }

    @Transactional(readOnly = true)
    public SopDto getSopById(UUID id) {
        Sop sop = sopRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SOP not found with ID: " + id));

        return mapToDto(sop);
    }

    @Transactional
    public SopDto updateSop(UUID id, CreateSopRequest request) {
        Sop sop = sopRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SOP not found with ID: " + id));

        CorporateEntity entity = resolveEntity(request.getEntityCode());

        sop.setTitle(request.getTitle());
        sop.setDescription(request.getDescription());
        sop.setProcessCategory(request.getProcessCategory());
        sop.setEntity(entity);
        sop.setFrequency(request.getFrequency());
        sop.setDueDayOffset(request.getDueDayOffset());
        if (request.getIsRecurring() != null) {
            sop.setIsRecurring(request.getIsRecurring());
        }
        sop.setVersion((sop.getVersion() == null ? 1 : sop.getVersion() + 1));

        if (request.getDefaultMakerIds() != null && !request.getDefaultMakerIds().isEmpty()) {
            sop.setDefaultMakerIds(new java.util.ArrayList<>(request.getDefaultMakerIds()));
        }
        if (request.getDefaultCheckerIds() != null && !request.getDefaultCheckerIds().isEmpty()) {
            sop.setDefaultCheckerIds(new java.util.ArrayList<>(request.getDefaultCheckerIds()));
        }

        Sop saved = sopRepository.save(sop);

        AuditLog auditLog = AuditLog.builder()
            .actorId(request.getCreatedById() != null ? request.getCreatedById() : (sop.getCreatedBy() != null ? sop.getCreatedBy().getUserId() : "usr-manoj-042"))
            .action("UPDATE_SOP")
            .entityType("SOP")
            .entityId(saved.getSopCode())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);

        return mapToDto(saved);
    }

    @Transactional
    public void deleteSop(UUID id) {
        Sop sop = sopRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SOP not found with ID: " + id));

        sop.setStatus(SopStatus.ARCHIVED);
        sopRepository.save(sop);

        AuditLog auditLog = AuditLog.builder()
            .actorId(sop.getCreatedBy() != null ? sop.getCreatedBy().getUserId() : "usr-manoj-042")
            .action("DELETE_SOP")
            .entityType("SOP")
            .entityId(sop.getSopCode())
            .correlationId(UUID.randomUUID().toString())
            .build();
        auditLogRepository.save(auditLog);
    }

    public SopDto mapToDto(Sop sop) {
        List<String> mIds = (sop.getDefaultMakerIds() != null && !sop.getDefaultMakerIds().isEmpty())
            ? sop.getDefaultMakerIds() : List.of();
        List<String> mNames = mIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
            .toList();

        List<String> cIds = (sop.getDefaultCheckerIds() != null && !sop.getDefaultCheckerIds().isEmpty())
            ? sop.getDefaultCheckerIds() : List.of();
        List<String> cNames = cIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(id))
            .toList();

        return SopDto.builder()
            .sopId(sop.getSopId())
            .sopCode(sop.getSopCode())
            .title(sop.getTitle())
            .description(sop.getDescription())
            .processCategory(sop.getProcessCategory())
            .entityCode(sop.getEntity().getEntityCode())
            .entityName(sop.getEntity().getEntityName())
            .frequency(sop.getFrequency())
            .dueDayOffset(sop.getDueDayOffset())
            .isRecurring(Boolean.TRUE.equals(sop.getIsRecurring()))
            .defaultMakerId(mIds.isEmpty() ? null : mIds.get(0))
            .defaultMakerName(mNames.isEmpty() ? null : mNames.get(0))
            .defaultMakerIds(mIds)
            .defaultMakerNames(mNames)
            .defaultCheckerId(cIds.isEmpty() ? null : cIds.get(0))
            .defaultCheckerName(cNames.isEmpty() ? null : cNames.get(0))
            .defaultCheckerIds(cIds)
            .defaultCheckerNames(cNames)
            .assignedCreatorId(sop.getAssignedCreatorId())
            .assignedCreatorName(sop.getAssignedCreatorId() != null ? userRepository.findById(sop.getAssignedCreatorId()).map(User::getFullName).orElse(sop.getAssignedCreatorId()) : null)
            .assignedApproverId(sop.getAssignedApproverId())
            .assignedApproverName(sop.getAssignedApproverId() != null ? userRepository.findById(sop.getAssignedApproverId()).map(User::getFullName).orElse(sop.getAssignedApproverId()) : null)
            .rejectionReason(sop.getRejectionReason())
            .status(sop.getStatus())
            .version(sop.getVersion() != null ? sop.getVersion() : 1)
            .build();
    }

    private CorporateEntity resolveEntity(EntityCode code) {
        EntityCode targetCode = (code != null) ? code : EntityCode.CK_INDIA;
        return entityRepository.findById(targetCode)
            .orElseGet(() -> entityRepository.save(
                CorporateEntity.builder()
                    .entityCode(targetCode)
                    .entityName(targetCode.name().replace("_", " "))
                    .build()
            ));
    }

    private User resolveUser(String userId, UserRole fallbackRole, CorporateEntity entity) {
        String targetId = (userId != null && !userId.isBlank()) ? userId : "usr-mainak-215";
        return userRepository.findById(targetId)
            .orElseGet(() -> userRepository.save(
                User.builder()
                    .userId(targetId)
                    .fullName(targetId.replace("usr-", "").replace("-", " "))
                    .email(targetId.toLowerCase() + "@cloudkaptan.com")
                    .role(fallbackRole)
                    .entity(entity)
                    .isActive(true)
                    .build()
            ));
    }
}

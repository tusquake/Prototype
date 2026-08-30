package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.dto.CreateSopRequest;
import com.cloudkaptan.sop.dto.SopDto;
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

    public static final ConcurrentHashMap<UUID, List<String>> makerPoolMap = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<UUID, List<String>> checkerPoolMap = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public List<SopDto> getSops(List<EntityCode> entities) {
        List<Sop> sops = (entities == null || entities.isEmpty())
            ? sopRepository.findAll()
            : sopRepository.findByStatusAndEntityIn(SopStatus.ACTIVE, entities);

        return sops.stream()
            .map(this::mapToDto)
            .toList();
    }

    @Transactional
    public SopDto createSop(CreateSopRequest request) {
        if (sopRepository.findBySopCode(request.getSopCode()).isPresent()) {
            throw new IllegalArgumentException("SOP code already exists: " + request.getSopCode());
        }

        CorporateEntity entity = entityRepository.findById(request.getEntityCode())
            .orElseThrow(() -> new ResourceNotFoundException("Corporate entity not found: " + request.getEntityCode()));

        User defaultMaker = userRepository.findById(request.getDefaultMakerId())
            .orElseThrow(() -> new ResourceNotFoundException("Default maker user not found: " + request.getDefaultMakerId()));

        User defaultChecker = userRepository.findById(request.getDefaultCheckerId())
            .orElseThrow(() -> new ResourceNotFoundException("Default checker user not found: " + request.getDefaultCheckerId()));

        User createdBy = userRepository.findById(request.getCreatedById())
            .orElseThrow(() -> new ResourceNotFoundException("Created by user not found: " + request.getCreatedById()));

        Sop sop = Sop.builder()
            .sopCode(request.getSopCode())
            .title(request.getTitle())
            .description(request.getDescription())
            .processCategory(request.getProcessCategory())
            .entity(entity)
            .frequency(request.getFrequency())
            .dueDayOffset(request.getDueDayOffset())
            .defaultMaker(defaultMaker)
            .defaultChecker(defaultChecker)
            .status(SopStatus.ACTIVE)
            .createdBy(createdBy)
            .build();

        Sop saved = sopRepository.save(sop);

        if (request.getDefaultMakerIds() != null && !request.getDefaultMakerIds().isEmpty()) {
            makerPoolMap.put(saved.getSopId(), request.getDefaultMakerIds());
        }
        if (request.getDefaultCheckerIds() != null && !request.getDefaultCheckerIds().isEmpty()) {
            checkerPoolMap.put(saved.getSopId(), request.getDefaultCheckerIds());
        }

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

        CorporateEntity entity = entityRepository.findById(request.getEntityCode())
            .orElseThrow(() -> new ResourceNotFoundException("Corporate entity not found: " + request.getEntityCode()));

        User defaultMaker = userRepository.findById(request.getDefaultMakerId())
            .orElseThrow(() -> new ResourceNotFoundException("Default maker user not found: " + request.getDefaultMakerId()));

        User defaultChecker = userRepository.findById(request.getDefaultCheckerId())
            .orElseThrow(() -> new ResourceNotFoundException("Default checker user not found: " + request.getDefaultCheckerId()));

        sop.setTitle(request.getTitle());
        sop.setDescription(request.getDescription());
        sop.setProcessCategory(request.getProcessCategory());
        sop.setEntity(entity);
        sop.setFrequency(request.getFrequency());
        sop.setDueDayOffset(request.getDueDayOffset());
        sop.setDefaultMaker(defaultMaker);
        sop.setDefaultChecker(defaultChecker);
        sop.setVersion((sop.getVersion() == null ? 1 : sop.getVersion() + 1));

        Sop saved = sopRepository.save(sop);

        if (request.getDefaultMakerIds() != null && !request.getDefaultMakerIds().isEmpty()) {
            makerPoolMap.put(saved.getSopId(), request.getDefaultMakerIds());
        }
        if (request.getDefaultCheckerIds() != null && !request.getDefaultCheckerIds().isEmpty()) {
            checkerPoolMap.put(saved.getSopId(), request.getDefaultCheckerIds());
        }

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
        List<String> mIds = makerPoolMap.getOrDefault(sop.getSopId(), List.of(sop.getDefaultMaker().getUserId()));
        List<String> mNames = mIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(sop.getDefaultMaker().getFullName()))
            .toList();

        List<String> cIds = checkerPoolMap.getOrDefault(sop.getSopId(), List.of(sop.getDefaultChecker().getUserId()));
        List<String> cNames = cIds.stream()
            .map(id -> userRepository.findById(id).map(User::getFullName).orElse(sop.getDefaultChecker().getFullName()))
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
            .defaultMakerId(sop.getDefaultMaker().getUserId())
            .defaultMakerName(sop.getDefaultMaker().getFullName())
            .defaultMakerIds(mIds)
            .defaultMakerNames(mNames)
            .defaultCheckerId(sop.getDefaultChecker().getUserId())
            .defaultCheckerName(sop.getDefaultChecker().getFullName())
            .defaultCheckerIds(cIds)
            .defaultCheckerNames(cNames)
            .status(sop.getStatus())
            .version(sop.getVersion() != null ? sop.getVersion() : 1)
            .build();
    }
}

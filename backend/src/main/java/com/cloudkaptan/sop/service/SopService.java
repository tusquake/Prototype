package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.SopStatus;
import com.cloudkaptan.sop.dto.CreateSopRequest;
import com.cloudkaptan.sop.dto.SopDto;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import com.cloudkaptan.sop.repository.SopRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SopService {

    private final SopRepository sopRepository;
    private final CorporateEntityRepository entityRepository;
    private final UserRepository userRepository;
    private final TaskSchedulerService taskSchedulerService;

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

        // Automatically trigger scheduler engine to create task for the new SOP
        try {
            taskSchedulerService.generateScheduledTasks();
        } catch (Exception e) {
            // Non-fatal if scheduler runs concurrently
        }

        return mapToDto(saved);
    }

    public SopDto mapToDto(Sop sop) {
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
            .defaultCheckerId(sop.getDefaultChecker().getUserId())
            .defaultCheckerName(sop.getDefaultChecker().getFullName())
            .status(sop.getStatus())
            .build();
    }
}

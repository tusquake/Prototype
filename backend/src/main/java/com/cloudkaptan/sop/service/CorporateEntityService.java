package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.CorporateEntityDto;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CorporateEntityService {

    private final CorporateEntityRepository entityRepository;

    public List<CorporateEntityDto> getAllEntities() {
        List<CorporateEntity> entities = entityRepository.findAll();
        return entities.stream()
                .map(e -> CorporateEntityDto.builder()
                        .entityCode(e.getEntityCode())
                        .entityName(e.getEntityName())
                        .id(e.getEntityCode() != null ? e.getEntityCode().name() : null)
                        .label(e.getEntityName() != null ? e.getEntityName() : (e.getEntityCode() != null ? e.getEntityCode().name() : ""))
                        .build())
                .collect(Collectors.toList());
    }
}

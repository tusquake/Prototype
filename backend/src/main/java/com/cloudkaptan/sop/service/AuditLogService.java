package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.AuditLogDto;
import com.cloudkaptan.sop.dto.AuditLogFilterRequest;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AuditLogDto> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc().stream()
            .map(this::mapToDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> getAllAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByTimestampDesc(pageable)
            .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> getFilteredAuditLogs(AuditLogFilterRequest request, Pageable pageable) {
        List<AuditLog> all;
        if (request.getEntityType() != null && !request.getEntityType().isBlank()
                && request.getEntityId() != null && !request.getEntityId().isBlank()) {
            all = auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(
                    request.getEntityType(), request.getEntityId());
        } else {
            all = auditLogRepository.findAllByOrderByTimestampDesc();
        }

        List<AuditLogDto> filtered = all.stream()
                .filter(a -> {
                    if (request.getActorId() != null && !request.getActorId().isBlank()
                            && !request.getActorId().equalsIgnoreCase(a.getActorId())) return false;
                    if (request.getAction() != null && !request.getAction().isBlank()
                            && !request.getAction().equalsIgnoreCase(a.getAction())) return false;
                    if (request.getSearch() != null && !request.getSearch().isBlank()) {
                        String q = request.getSearch().trim().toLowerCase();
                        boolean match = (a.getAction() != null && a.getAction().toLowerCase().contains(q))
                                || (a.getEntityType() != null && a.getEntityType().toLowerCase().contains(q))
                                || (a.getActorId() != null && a.getActorId().toLowerCase().contains(q));
                        if (!match) return false;
                    }
                    return true;
                })
                .map(this::mapToDto)
                .toList();

        int start = (int) pageable.getOffset();
        if (start >= filtered.size()) {
            return new PageImpl<>(List.of(), pageable, filtered.size());
        }
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    private AuditLogDto mapToDto(AuditLog auditLog) {
        Optional<User> userOpt = userRepository.findById(auditLog.getActorId());
        String actorName = userOpt.map(User::getFullName).orElse(auditLog.getActorId());
        String actorEmail = userOpt.map(User::getEmail).orElse("");

        return AuditLogDto.builder()
            .auditId(auditLog.getAuditId())
            .actorId(auditLog.getActorId())
            .actorName(actorName)
            .actorEmail(actorEmail)
            .action(auditLog.getAction())
            .entityType(auditLog.getEntityType())
            .entityId(auditLog.getEntityId())
            .correlationId(auditLog.getCorrelationId())
            .timestamp(auditLog.getTimestamp())
            .build();
    }
}

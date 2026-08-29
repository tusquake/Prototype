package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.AuditLogDto;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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

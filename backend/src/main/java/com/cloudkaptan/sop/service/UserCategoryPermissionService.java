package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.entity.UserCategoryPermission;
import com.cloudkaptan.sop.repository.UserCategoryPermissionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserCategoryPermissionService {

    private final UserCategoryPermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<CategoryPermissionDto> getUserPermissions(String userId) {
        List<UserCategoryPermission> list = permissionRepository.findByUserId(userId);
        return list.stream().map(this::mapToDto).toList();
    }

    @Transactional
    public CategoryPermissionDto grantPermission(GrantPermissionRequest request) {
        Optional<UserCategoryPermission> existing = permissionRepository
                .findByUserIdAndProcessCategory(request.getUserId(), request.getProcessCategory());

        UserCategoryPermission entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setCanCreateSop(request.getCanCreateSop());
            entity.setCanApproveSop(request.getCanApproveSop());
            entity.setCanMakeTask(request.getCanMakeTask());
            entity.setCanCheckTask(request.getCanCheckTask());
        } else {
            entity = UserCategoryPermission.builder()
                    .userId(request.getUserId())
                    .processCategory(request.getProcessCategory())
                    .canCreateSop(request.getCanCreateSop())
                    .canApproveSop(request.getCanApproveSop())
                    .canMakeTask(request.getCanMakeTask())
                    .canCheckTask(request.getCanCheckTask())
                    .build();
        }

        UserCategoryPermission saved = permissionRepository.save(entity);
        log.info("Granted permissions for user [{}] on category [{}]", request.getUserId(), request.getProcessCategory());
        return mapToDto(saved);
    }

    @Transactional
    public void revokePermission(String userId, String processCategory) {
        permissionRepository.deleteByUserIdAndProcessCategory(userId, processCategory);
        log.info("Revoked permissions for user [{}] on category [{}]", userId, processCategory);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(String userId, String processCategory, String action) {
        Optional<UserCategoryPermission> perm = permissionRepository.findByUserIdAndProcessCategory(userId, processCategory);
        if (perm.isEmpty()) return false;

        UserCategoryPermission p = perm.get();
        return switch (action.toUpperCase()) {
            case "CREATE_SOP", "DRAFT_SOP" -> Boolean.TRUE.equals(p.getCanCreateSop());
            case "APPROVE_SOP" -> Boolean.TRUE.equals(p.getCanApproveSop());
            case "MAKE_TASK", "SUBMIT_TASK" -> Boolean.TRUE.equals(p.getCanMakeTask());
            case "CHECK_TASK", "APPROVE_TASK" -> Boolean.TRUE.equals(p.getCanCheckTask());
            default -> false;
        };
    }

    public CategoryPermissionDto mapToDto(UserCategoryPermission entity) {
        return CategoryPermissionDto.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .processCategory(entity.getProcessCategory())
                .canCreateSop(entity.getCanCreateSop())
                .canApproveSop(entity.getCanApproveSop())
                .canMakeTask(entity.getCanMakeTask())
                .canCheckTask(entity.getCanCheckTask())
                .build();
    }
}

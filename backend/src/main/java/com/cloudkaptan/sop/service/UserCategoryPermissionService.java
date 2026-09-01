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
    public com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto getCategoryAssignments(String processCategory) {
        List<UserCategoryPermission> list = permissionRepository.findByProcessCategory(processCategory);

        List<String> creators = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanCreateSop())).map(UserCategoryPermission::getUserId).toList();
        List<String> approvers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanApproveSop())).map(UserCategoryPermission::getUserId).toList();
        List<String> makers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanMakeTask())).map(UserCategoryPermission::getUserId).toList();
        List<String> checkers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanCheckTask())).map(UserCategoryPermission::getUserId).toList();

        return com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto.builder()
                .processCategory(processCategory)
                .creatorUserIds(creators)
                .approverUserIds(approvers)
                .makerUserIds(makers)
                .checkerUserIds(checkers)
                .build();
    }

    @Transactional
    public com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto saveCategoryAssignments(com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto dto) {
        String category = dto.getProcessCategory();

        // 1. Collect all candidate user IDs mentioned in request
        java.util.Set<String> allUserIds = new java.util.HashSet<>();
        if (dto.getCreatorUserIds() != null) allUserIds.addAll(dto.getCreatorUserIds());
        if (dto.getApproverUserIds() != null) allUserIds.addAll(dto.getApproverUserIds());
        if (dto.getMakerUserIds() != null) allUserIds.addAll(dto.getMakerUserIds());
        if (dto.getCheckerUserIds() != null) allUserIds.addAll(dto.getCheckerUserIds());

        // Also fetch existing users for this category to revoke if unticked
        List<UserCategoryPermission> existingList = permissionRepository.findByProcessCategory(category);
        for (UserCategoryPermission p : existingList) {
            allUserIds.add(p.getUserId());
        }

        // 2. Update permissions for each user
        for (String uId : allUserIds) {
            boolean isCreator = dto.getCreatorUserIds() != null && dto.getCreatorUserIds().contains(uId);
            boolean isApprover = dto.getApproverUserIds() != null && dto.getApproverUserIds().contains(uId);
            boolean isMaker = dto.getMakerUserIds() != null && dto.getMakerUserIds().contains(uId);
            boolean isChecker = dto.getCheckerUserIds() != null && dto.getCheckerUserIds().contains(uId);

            Optional<UserCategoryPermission> existing = permissionRepository.findByUserIdAndProcessCategory(uId, category);
            if (existing.isPresent()) {
                UserCategoryPermission entity = existing.get();
                entity.setCanCreateSop(isCreator);
                entity.setCanApproveSop(isApprover);
                entity.setCanMakeTask(isMaker);
                entity.setCanCheckTask(isChecker);
                permissionRepository.save(entity);
            } else if (isCreator || isApprover || isMaker || isChecker) {
                UserCategoryPermission entity = UserCategoryPermission.builder()
                        .userId(uId)
                        .processCategory(category)
                        .canCreateSop(isCreator)
                        .canApproveSop(isApprover)
                        .canMakeTask(isMaker)
                        .canCheckTask(isChecker)
                        .build();
                permissionRepository.save(entity);
            }
        }

        log.info("Successfully updated category-centric assignments for category [{}]", category);
        return getCategoryAssignments(category);
    }

    @Transactional(readOnly = true)
    public List<String> getUserAccessibleCategories(String userId) {
        List<UserCategoryPermission> list = permissionRepository.findByUserId(userId);
        return list.stream()
                .filter(p -> Boolean.TRUE.equals(p.getCanCreateSop())
                          || Boolean.TRUE.equals(p.getCanApproveSop())
                          || Boolean.TRUE.equals(p.getCanMakeTask())
                          || Boolean.TRUE.equals(p.getCanCheckTask()))
                .map(UserCategoryPermission::getProcessCategory)
                .distinct()
                .toList();
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

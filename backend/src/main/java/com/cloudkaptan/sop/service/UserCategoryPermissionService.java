package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.dto.CategoryAccessAssignmentDto;
import com.cloudkaptan.sop.dto.CategoryPermissionDto;
import com.cloudkaptan.sop.dto.GrantPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateCategoryAccessTypeRequest;
import com.cloudkaptan.sop.dto.UpdateUserCategoryPermissionRequest;
import com.cloudkaptan.sop.dto.UpdateSinglePermissionRequest;
import com.cloudkaptan.sop.entity.AccessControlActivityLog;
import com.cloudkaptan.sop.entity.AuditLog;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.entity.UserCategoryPermission;
import com.cloudkaptan.sop.repository.AccessControlActivityLogRepository;
import com.cloudkaptan.sop.repository.AuditLogRepository;
import com.cloudkaptan.sop.repository.UserCategoryPermissionRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserCategoryPermissionService {

    private final UserCategoryPermissionRepository permissionRepository;
    private final AccessControlActivityLogRepository accessControlActivityLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

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
    public CategoryAccessAssignmentDto getCategoryAssignments(String processCategory) {
        List<UserCategoryPermission> list = permissionRepository.findByProcessCategory(processCategory);

        List<String> creators = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanCreateSop())).map(UserCategoryPermission::getUserId).toList();
        List<String> approvers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanApproveSop())).map(UserCategoryPermission::getUserId).toList();
        List<String> makers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanMakeTask())).map(UserCategoryPermission::getUserId).toList();
        List<String> checkers = list.stream().filter(p -> Boolean.TRUE.equals(p.getCanCheckTask())).map(UserCategoryPermission::getUserId).toList();

        return CategoryAccessAssignmentDto.builder()
                .processCategory(processCategory)
                .creatorUserIds(creators)
                .approverUserIds(approvers)
                .makerUserIds(makers)
                .checkerUserIds(checkers)
                .build();
    }

    @Transactional
    public CategoryAccessAssignmentDto saveCategoryAssignments(CategoryAccessAssignmentDto dto) {
        return saveCategoryAssignments(dto, null);
    }

    @Transactional
    public CategoryAccessAssignmentDto saveCategoryAssignments(CategoryAccessAssignmentDto dto, String actorId) {
        String category = dto.getProcessCategory();

        // Fetch previous assignments for diff calculation
        CategoryAccessAssignmentDto prev = getCategoryAssignments(category);

        // 1. Collect all candidate user IDs mentioned in request
        Set<String> allUserIds = new HashSet<>();
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

        CategoryAccessAssignmentDto updated = getCategoryAssignments(category);

        // 3. Compute Detailed Diff & Log Activity
        recordAccessControlAudit(category, prev, updated, actorId);

        log.info("Successfully updated category-centric assignments for category [{}]", category);
        return updated;
    }

    private void recordAccessControlAudit(String category, CategoryAccessAssignmentDto prev, CategoryAccessAssignmentDto updated, String actorId) {
        List<String> prevCreators = prev.getCreatorUserIds() != null ? prev.getCreatorUserIds() : Collections.emptyList();
        List<String> newCreators = updated.getCreatorUserIds() != null ? updated.getCreatorUserIds() : Collections.emptyList();

        List<String> prevApprovers = prev.getApproverUserIds() != null ? prev.getApproverUserIds() : Collections.emptyList();
        List<String> newApprovers = updated.getApproverUserIds() != null ? updated.getApproverUserIds() : Collections.emptyList();

        List<String> prevMakers = prev.getMakerUserIds() != null ? prev.getMakerUserIds() : Collections.emptyList();
        List<String> newMakers = updated.getMakerUserIds() != null ? updated.getMakerUserIds() : Collections.emptyList();

        List<String> prevCheckers = prev.getCheckerUserIds() != null ? prev.getCheckerUserIds() : Collections.emptyList();
        List<String> newCheckers = updated.getCheckerUserIds() != null ? updated.getCheckerUserIds() : Collections.emptyList();

        List<String> addedCreators = newCreators.stream().filter(u -> !prevCreators.contains(u)).toList();
        List<String> removedCreators = prevCreators.stream().filter(u -> !newCreators.contains(u)).toList();

        List<String> addedApprovers = newApprovers.stream().filter(u -> !prevApprovers.contains(u)).toList();
        List<String> removedApprovers = prevApprovers.stream().filter(u -> !newApprovers.contains(u)).toList();

        List<String> addedMakers = newMakers.stream().filter(u -> !prevMakers.contains(u)).toList();
        List<String> removedMakers = prevMakers.stream().filter(u -> !newMakers.contains(u)).toList();

        List<String> addedCheckers = newCheckers.stream().filter(u -> !prevCheckers.contains(u)).toList();
        List<String> removedCheckers = prevCheckers.stream().filter(u -> !newCheckers.contains(u)).toList();

        List<String> diffs = new ArrayList<>();
        if (!addedCreators.isEmpty()) diffs.add("Added SOP Creator(s): " + String.join(", ", addedCreators));
        if (!removedCreators.isEmpty()) diffs.add("Removed SOP Creator(s): " + String.join(", ", removedCreators));

        if (!addedApprovers.isEmpty()) diffs.add("Added SOP Approver(s): " + String.join(", ", addedApprovers));
        if (!removedApprovers.isEmpty()) diffs.add("Removed SOP Approver(s): " + String.join(", ", removedApprovers));

        if (!addedMakers.isEmpty()) diffs.add("Added Task Submitter(s): " + String.join(", ", addedMakers));
        if (!removedMakers.isEmpty()) diffs.add("Removed Task Submitter(s): " + String.join(", ", removedMakers));

        if (!addedCheckers.isEmpty()) diffs.add("Added Task Approver(s): " + String.join(", ", addedCheckers));
        if (!removedCheckers.isEmpty()) diffs.add("Removed Task Approver(s): " + String.join(", ", removedCheckers));

        String detailsString = diffs.isEmpty()
                ? "Re-saved access control permissions with no user changes."
                : "Updated access permissions: " + String.join("; ", diffs);

        // Resolve actor user dynamically
        String targetActorId = (actorId != null && !actorId.isBlank()) ? actorId : "usr-manoj-042";
        User actorUser = userRepository.findById(targetActorId)
                .or(() -> userRepository.findByEmail(targetActorId))
                .orElse(null);

        String resolvedActorId = (actorUser != null) ? actorUser.getUserId() : targetActorId;
        String resolvedActorName = (actorUser != null) ? actorUser.getFullName() : (targetActorId.contains("@") ? targetActorId.split("@")[0] : targetActorId);

        // a. Save to Dedicated Access Control Activity Log Table
        AccessControlActivityLog activityLog = AccessControlActivityLog.builder()
                .processCategory(category)
                .action("ACCESS_CONTROL_UPDATED")
                .actorId(resolvedActorId)
                .actorName(resolvedActorName)
                .details(detailsString)
                .build();
        accessControlActivityLogRepository.save(activityLog);

        // b. Save to Global Audit Logs Table
        AuditLog globalAudit = AuditLog.builder()
                .actorId(resolvedActorId)
                .action("ACCESS_CONTROL_UPDATED")
                .entityType("ACCESS_CONTROL")
                .entityId(category)
                .build();
        auditLogRepository.save(globalAudit);
    }

    @Transactional(readOnly = true)
    public List<AccessControlActivityLog> getAccessControlActivityLogs(String processCategory) {
        if (processCategory != null && !processCategory.isBlank()) {
            return accessControlActivityLogRepository.findByProcessCategoryOrderByTimestampDesc(processCategory);
        }
        return accessControlActivityLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<String> getUsersByPermission(String processCategory, String permissionType) {
        List<UserCategoryPermission> list = permissionRepository.findByProcessCategory(processCategory);
        return list.stream()
                .filter(p -> switch (permissionType.toUpperCase()) {
                    case "CAN_CREATE_SOP", "CREATOR"  -> Boolean.TRUE.equals(p.getCanCreateSop());
                    case "CAN_APPROVE_SOP", "APPROVER" -> Boolean.TRUE.equals(p.getCanApproveSop());
                    case "CAN_MAKE_TASK", "MAKER"      -> Boolean.TRUE.equals(p.getCanMakeTask());
                    case "CAN_CHECK_TASK", "CHECKER"   -> Boolean.TRUE.equals(p.getCanCheckTask());
                    default -> false;
                })
                .map(UserCategoryPermission::getUserId)
                .distinct()
                .toList();
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

    @Transactional
    public CategoryAccessAssignmentDto updateCategoryAccessType(String categoryCode, String accessType, List<String> targetUserIds, String actorId) {
        CategoryAccessAssignmentDto current = getCategoryAssignments(categoryCode);
        List<String> creators = new ArrayList<>(current.getCreatorUserIds() != null ? current.getCreatorUserIds() : Collections.emptyList());
        List<String> approvers = new ArrayList<>(current.getApproverUserIds() != null ? current.getApproverUserIds() : Collections.emptyList());
        List<String> makers = new ArrayList<>(current.getMakerUserIds() != null ? current.getMakerUserIds() : Collections.emptyList());
        List<String> checkers = new ArrayList<>(current.getCheckerUserIds() != null ? current.getCheckerUserIds() : Collections.emptyList());

        List<String> newUsers = targetUserIds != null ? targetUserIds : Collections.emptyList();

        switch (accessType.toUpperCase()) {
            case "CREATE_SOP", "CREATOR", "CANCREATESOP" -> creators = newUsers;
            case "APPROVE_SOP", "APPROVER", "CANAPPROVESOP" -> approvers = newUsers;
            case "MAKE_TASK", "MAKER", "SUBMITTER", "CANMAKETASK" -> makers = newUsers;
            case "CHECK_TASK", "CHECKER", "CANCHECKTASK" -> checkers = newUsers;
            default -> throw new IllegalArgumentException("Invalid access type: " + accessType + ". Expected one of: CREATE_SOP, APPROVE_SOP, MAKE_TASK, CHECK_TASK");
        }

        CategoryAccessAssignmentDto updatedDto = CategoryAccessAssignmentDto.builder()
                .processCategory(categoryCode)
                .creatorUserIds(creators)
                .approverUserIds(approvers)
                .makerUserIds(makers)
                .checkerUserIds(checkers)
                .build();

        return saveCategoryAssignments(updatedDto, actorId);
    }

    @Transactional
    public CategoryPermissionDto updateUserCategoryPermission(String userId, String categoryCode, UpdateUserCategoryPermissionRequest request, String actorId) {
        Optional<UserCategoryPermission> existing = permissionRepository.findByUserIdAndProcessCategory(userId, categoryCode);
        UserCategoryPermission entity;
        if (existing.isPresent()) {
            entity = existing.get();
            if (request.getCanCreateSop() != null) entity.setCanCreateSop(request.getCanCreateSop());
            if (request.getCanApproveSop() != null) entity.setCanApproveSop(request.getCanApproveSop());
            if (request.getCanMakeTask() != null) entity.setCanMakeTask(request.getCanMakeTask());
            if (request.getCanCheckTask() != null) entity.setCanCheckTask(request.getCanCheckTask());
        } else {
            entity = UserCategoryPermission.builder()
                    .userId(userId)
                    .processCategory(categoryCode)
                    .canCreateSop(Boolean.TRUE.equals(request.getCanCreateSop()))
                    .canApproveSop(Boolean.TRUE.equals(request.getCanApproveSop()))
                    .canMakeTask(Boolean.TRUE.equals(request.getCanMakeTask()))
                    .canCheckTask(Boolean.TRUE.equals(request.getCanCheckTask()))
                    .build();
        }
        UserCategoryPermission saved = permissionRepository.save(entity);
        log.info("Updated category permissions for user [{}] on category [{}] via PUT API", userId, categoryCode);

        // Record audit
        CategoryAccessAssignmentDto updatedAssignments = getCategoryAssignments(categoryCode);
        recordAccessControlAudit(categoryCode, getCategoryAssignments(categoryCode), updatedAssignments, actorId);

        return mapToDto(saved);
    }

    @Transactional
    public CategoryPermissionDto updateSinglePermission(String userId, String categoryCode, String accessType, Boolean enabled, String actorId) {
        UpdateUserCategoryPermissionRequest req = new UpdateUserCategoryPermissionRequest();
        boolean isEnabled = Boolean.TRUE.equals(enabled);
        switch (accessType.toUpperCase()) {
            case "CREATE_SOP", "CREATOR", "CANCREATESOP" -> req.setCanCreateSop(isEnabled);
            case "APPROVE_SOP", "APPROVER", "CANAPPROVESOP" -> req.setCanApproveSop(isEnabled);
            case "MAKE_TASK", "MAKER", "SUBMITTER", "CANMAKETASK" -> req.setCanMakeTask(isEnabled);
            case "CHECK_TASK", "CHECKER", "CANCHECKTASK" -> req.setCanCheckTask(isEnabled);
            default -> throw new IllegalArgumentException("Invalid access type: " + accessType);
        }
        return updateUserCategoryPermission(userId, categoryCode, req, actorId);
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

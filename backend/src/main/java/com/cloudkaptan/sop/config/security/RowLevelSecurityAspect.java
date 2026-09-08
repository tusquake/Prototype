package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.SopDto;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Aspect-Oriented Programming (AOP) Aspect for enforcing Row Level Security (RLS)
 * across database query execution results using ThreadLocal TenantContext.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RowLevelSecurityAspect {

    private final UserRepository userRepository;

    @Around("@annotation(applyRowLevelSecurity) || @within(applyRowLevelSecurity)")
    public Object enforceRowLevelSecurity(ProceedingJoinPoint joinPoint, ApplyRowLevelSecurity applyRowLevelSecurity) throws Throwable {
        Object result = joinPoint.proceed();

        String currentUserId = TenantContext.getCurrentUserId();
        UserRole currentRole = TenantContext.getCurrentUserRole();

        if (currentUserId == null || currentUserId.isBlank()) {
            return result;
        }

        // 1. ADMIN role or super-admins bypass filtering
        if (currentRole == UserRole.ADMIN || "usr-manoj-042".equals(currentUserId) || "usr-avisek-499".equals(currentUserId)) {
            log.debug("RowLevelSecurityAspect: Admin user [{}] granted unrestricted access.", currentUserId);
            return result;
        }

        User user = userRepository.findById(currentUserId).orElse(null);
        String targetName = (user != null && user.getFullName() != null) ? user.getFullName().toLowerCase().trim() : "";

        // Combine the user's ID with their readable subordinates' IDs
        List<String> authorizedIds = new ArrayList<>();
        authorizedIds.add(currentUserId);
        
        List<String> readableSubordinates = TenantContext.getContext().getReadableSubordinateIds();
        if (readableSubordinates != null) {
            authorizedIds.addAll(readableSubordinates);
        }

        // 2. Intercept and filter Task DTO list transparently
        if (result instanceof List<?> list && !list.isEmpty()) {
            Object firstElement = list.get(0);

            if (firstElement instanceof TaskDto) {
                log.debug("RowLevelSecurityAspect: Filtering Task list for user [{}] and downline via TenantContext", currentUserId);
                @SuppressWarnings("unchecked")
                List<TaskDto> taskList = (List<TaskDto>) result;

                return taskList.stream().filter(t -> {
                    boolean makerMatch = containsAny(t.getAssignedMakerIds(), authorizedIds)
                        || matchesAny(t.getMakerId(), authorizedIds)
                        || matchesAny(t.getActualMakerId(), authorizedIds)
                        || (t.getMakerName() != null && t.getMakerName().toLowerCase().contains(targetName));

                    boolean checkerMatch = containsAny(t.getAssignedCheckerIds(), authorizedIds)
                        || matchesAny(t.getCheckerId(), authorizedIds)
                        || matchesAny(t.getActualCheckerId(), authorizedIds)
                        || (t.getCheckerName() != null && t.getCheckerName().toLowerCase().contains(targetName));

                    return makerMatch || checkerMatch;
                }).toList();
            }

            // 3. Intercept and filter SOP DTO list transparently
            if (firstElement instanceof SopDto) {
                log.debug("RowLevelSecurityAspect: Filtering SOP list for user [{}] and downline via TenantContext", currentUserId);
                @SuppressWarnings("unchecked")
                List<SopDto> sopList = (List<SopDto>) result;

                return sopList.stream().filter(s -> {
                    boolean creatorMatch = matchesAny(s.getAssignedCreatorId(), authorizedIds)
                        || (s.getAssignedCreatorName() != null && s.getAssignedCreatorName().toLowerCase().contains(targetName));
                    boolean approverMatch = matchesAny(s.getAssignedApproverId(), authorizedIds)
                        || (s.getAssignedApproverName() != null && s.getAssignedApproverName().toLowerCase().contains(targetName));
                    boolean makerMatch = containsAny(s.getDefaultMakerIds(), authorizedIds)
                        || matchesAny(s.getDefaultMakerId(), authorizedIds);
                    boolean checkerMatch = containsAny(s.getDefaultCheckerIds(), authorizedIds)
                        || matchesAny(s.getDefaultCheckerId(), authorizedIds);

                    return creatorMatch || approverMatch || makerMatch || checkerMatch;
                }).toList();
            }
        }

        return result;
    }

    // Helper: Returns true if the lists share at least one element
    private boolean containsAny(List<String> sourceList, List<String> targetIds) {
        if (sourceList == null || sourceList.isEmpty()) return false;
        return !Collections.disjoint(sourceList, targetIds);
    }

    // Helper: Returns true if the single ID is in the target list
    private boolean matchesAny(String singleId, List<String> targetIds) {
        if (singleId == null || singleId.isBlank()) return false;
        return targetIds.contains(singleId);
    }
}
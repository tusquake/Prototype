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
        String targetId = currentUserId;
        String targetName = (user != null && user.getFullName() != null) ? user.getFullName().toLowerCase().trim() : "";

        // 2. Intercept and filter Task DTO list transparently
        if (result instanceof List<?> list && !list.isEmpty()) {
            Object firstElement = list.get(0);

            if (firstElement instanceof TaskDto) {
                log.debug("RowLevelSecurityAspect: Filtering Task list for user [{}] via TenantContext", currentUserId);
                @SuppressWarnings("unchecked")
                List<TaskDto> taskList = (List<TaskDto>) result;

                return taskList.stream().filter(t -> {
                    boolean makerMatch = (t.getAssignedMakerIds() != null && t.getAssignedMakerIds().contains(targetId))
                        || (t.getMakerId() != null && t.getMakerId().equals(targetId))
                        || (t.getActualMakerId() != null && t.getActualMakerId().equals(targetId))
                        || (t.getMakerName() != null && t.getMakerName().toLowerCase().contains(targetName));

                    boolean checkerMatch = (t.getAssignedCheckerIds() != null && t.getAssignedCheckerIds().contains(targetId))
                        || (t.getCheckerId() != null && t.getCheckerId().equals(targetId))
                        || (t.getActualCheckerId() != null && t.getActualCheckerId().equals(targetId))
                        || (t.getCheckerName() != null && t.getCheckerName().toLowerCase().contains(targetName));

                    return makerMatch || checkerMatch;
                }).toList();
            }

            // 3. Intercept and filter SOP DTO list transparently
            if (firstElement instanceof SopDto) {
                log.debug("RowLevelSecurityAspect: Filtering SOP list for user [{}] via TenantContext", currentUserId);
                @SuppressWarnings("unchecked")
                List<SopDto> sopList = (List<SopDto>) result;

                return sopList.stream().filter(s -> {
                    boolean makerMatch = (s.getDefaultMakerIds() != null && s.getDefaultMakerIds().contains(targetId));
                    boolean checkerMatch = (s.getDefaultCheckerIds() != null && s.getDefaultCheckerIds().contains(targetId));
                    return makerMatch || checkerMatch;
                }).toList();
            }
        }

        return result;
    }
}

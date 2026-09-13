package com.cloudkaptan.sop.config.security;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Aspect-Oriented Programming (AOP) Aspect for PostgreSQL Native Row-Level Security (RLS).
 * Sets transaction-scoped PostgreSQL session GUC variables (app.current_user_id, app.current_user_role)
 * on the active JDBC connection before service method execution.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RowLevelSecurityAspect {

    @PersistenceContext
    private final EntityManager entityManager;

    @Around("@annotation(applyRowLevelSecurity) || @within(applyRowLevelSecurity)")
    public Object enforceRowLevelSecurity(ProceedingJoinPoint joinPoint, ApplyRowLevelSecurity applyRowLevelSecurity) throws Throwable {
        TenantContext ctx = TenantContext.getContext();
        if (ctx != null && ctx.getUserId() != null && !ctx.getUserId().isBlank()) {
            try {
                String userId = ctx.getUserId().trim();
                String userRole = ctx.getUserRole() != null ? ctx.getUserRole().name() : "VIEWER";

                entityManager.createNativeQuery("SET LOCAL app.current_user_id = '" + userId + "'").executeUpdate();
                entityManager.createNativeQuery("SET LOCAL app.current_user_role = '" + userRole + "'").executeUpdate();

                log.debug("Database Native RLS session set: app.current_user_id={}, app.current_user_role={}", userId, userRole);
            } catch (Exception e) {
                log.warn("Could not set PostgreSQL RLS session variables: {}", e.getMessage());
            }
        }
        return joinPoint.proceed();
    }
}
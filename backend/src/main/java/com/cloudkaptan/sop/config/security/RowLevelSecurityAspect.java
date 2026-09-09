package com.cloudkaptan.sop.config.security;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Aspect-Oriented Programming (AOP) Aspect for Row Level Security.
 * Currently disabled to allow SOP Creators, SOP Approvers, Managers, and assigned team members
 * to view all compliance tasks across their designated entities.
 */
@Slf4j
@Aspect
@Component
public class RowLevelSecurityAspect {

    @Around("@annotation(applyRowLevelSecurity) || @within(applyRowLevelSecurity)")
    public Object enforceRowLevelSecurity(ProceedingJoinPoint joinPoint, ApplyRowLevelSecurity applyRowLevelSecurity) throws Throwable {
        // Bypass AOP filtering to allow Creators, Approvers, Managers, and assigned users to view tasks
        return joinPoint.proceed();
    }
}
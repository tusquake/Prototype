package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that extracts tenant ID (corporate entity), user ID, and user role from incoming HTTP requests
 * and populates the ThreadLocal TenantContext for Row Level Security (RLS) evaluation.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class TenantSecurityFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String userId = resolveUserId(request);
            String tenantId = request.getHeader("X-Tenant-Id");
            if (tenantId == null || tenantId.isBlank()) {
                tenantId = request.getParameter("entityCode");
            }

            UserRole userRole = UserRole.MAKER;

            if (userId != null && !userId.isBlank()) {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    userRole = user.getRole();
                }
            }

            TenantContext context = TenantContext.builder()
                    .userId(userId)
                    .tenantId(tenantId)
                    .userRole(userRole)
                    .build();

            TenantContext.setContext(context);
            log.debug("TenantSecurityFilter initialized context: userId={}, tenantId={}, userRole={}", userId, tenantId, userRole);

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveUserId(HttpServletRequest request) {
        String userIdParam = request.getParameter("userId");
        if (userIdParam != null && !userIdParam.isBlank()) {
            return userIdParam;
        }

        String userIdHeader = request.getHeader("X-User-Id");
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            return userIdHeader;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            return auth.getName();
        }

        return null;
    }
}

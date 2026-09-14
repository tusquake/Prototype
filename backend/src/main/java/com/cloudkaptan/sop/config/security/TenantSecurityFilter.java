package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.UserHierarchyRepository;
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
import java.util.ArrayList;
import java.util.List;

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
    private final UserHierarchyRepository userHierarchyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String userId = resolveUserId(request);
            String tenantId = request.getHeader("X-Tenant-Id");
            if (tenantId == null || tenantId.isBlank()) {
                tenantId = request.getParameter("entityCode");
            }

            String userRoleHeader = request.getHeader("X-User-Role");
            UserRole userRole = UserRole.MAKER;
            if (userRoleHeader != null && !userRoleHeader.isBlank()) {
                try {
                    userRole = UserRole.valueOf(userRoleHeader.toUpperCase());
                } catch (Exception ignored) {}
            }

            List<String> readableSubordinates = new ArrayList<>();
            List<String> writableSubordinates = new ArrayList<>();
            String targetUserId = userId;

            if (userId != null && !userId.isBlank()) {
                User user = userRepository.findById(userId)
                        .or(() -> userRepository.findByEmail(userId))
                        .or(() -> userRepository.findByFullName(userId))
                        .or(() -> userRepository.findByFullNameIgnoreCase(userId))
                        .orElse(null);

                targetUserId = user != null ? user.getUserId() : userId;

                if (user != null) {
                    userRole = user.getRole();
                }

                // Execute in-memory recursive traversal to fetch downline hierarchy for targetUserId
                try {
                    List<com.cloudkaptan.sop.domain.entity.UserHierarchy> allRelations = userHierarchyRepository.findAll();
                    java.util.Set<String> readSubIds = new java.util.HashSet<>();
                    java.util.Set<String> writeSubIds = new java.util.HashSet<>();
                    java.util.Set<String> visited = new java.util.HashSet<>();

                    collectDownline(targetUserId, allRelations, readSubIds, writeSubIds, visited);

                    for (String subId : readSubIds) {
                        List<String> subTokens = resolveUserTokens(subId);
                        readableSubordinates.addAll(subTokens);
                    }
                    for (String subId : writeSubIds) {
                        List<String> subTokens = resolveUserTokens(subId);
                        writableSubordinates.addAll(subTokens);
                    }
                } catch (Exception e) {
                    log.error("Failed to load hierarchy downline for user [{}]: {}", targetUserId, e.getMessage());
                }
            }

            TenantContext context = TenantContext.builder()
                    .userId(userId)
                    .tenantId(tenantId)
                    .userRole(userRole)
                    .readableSubordinateIds(readableSubordinates.stream().distinct().toList()) // Inject read list
                    .writableSubordinateIds(writableSubordinates.stream().distinct().toList()) // Inject write list
                    .build();

            TenantContext.setContext(context);
            log.info("TenantSecurityFilter initialized context: userId={}, targetUserId={}, userRole={}, readableSubordinates={}, writableSubordinates={}", 
                      userId, targetUserId, userRole, readableSubordinates, writableSubordinates);

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

        String userEmailHeader = request.getHeader("X-User-Email");
        if (userEmailHeader != null && !userEmailHeader.isBlank()) {
            User user = userRepository.findByEmail(userEmailHeader).orElse(null);
            if (user != null) {
                return user.getUserId();
            }
            if (userEmailHeader.contains("manoj")) return "usr-manoj-042";
            if (userEmailHeader.contains("vivek")) return "usr-vivek-108";
            if (userEmailHeader.contains("mainak")) return "usr-mainak-215";
            if (userEmailHeader.contains("tushar")) return "usr-tushar-304";
            if (userEmailHeader.contains("prayasa")) return "usr-prayasa-410";
            if (userEmailHeader.contains("avisek")) return "usr-avisek2-003";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            return auth.getName();
        }

        return "usr-manoj-042";
    }

    private void collectDownline(String managerId, List<com.cloudkaptan.sop.domain.entity.UserHierarchy> allRelations, java.util.Set<String> readSubIds, java.util.Set<String> writeSubIds, java.util.Set<String> visited) {
        if (managerId == null || visited.contains(managerId)) return;
        visited.add(managerId);

        for (com.cloudkaptan.sop.domain.entity.UserHierarchy rel : allRelations) {
            if (managerId.equals(rel.getManagerId())) {
                String subId = rel.getSubordinateId();
                if (subId != null && !subId.isBlank()) {
                    if (rel.isCanReadTasks()) {
                        readSubIds.add(subId);
                    }
                    if (rel.isCanWriteTasks()) {
                        writeSubIds.add(subId);
                    }
                    // Recursive downline call
                    collectDownline(subId, allRelations, readSubIds, writeSubIds, visited);
                }
            }
        }
    }

    private List<String> resolveUserTokens(String identifier) {
        if (identifier == null || identifier.isBlank()) return List.of();
        List<String> tokens = new ArrayList<>();
        tokens.add(identifier.trim());
        User user = userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByFullName(identifier))
                .or(() -> userRepository.findByFullNameIgnoreCase(identifier))
                .orElse(null);
        if (user != null) {
            if (user.getUserId() != null) tokens.add(user.getUserId());
            if (user.getEmail() != null) tokens.add(user.getEmail());
            if (user.getFullName() != null) tokens.add(user.getFullName());
        }
        return tokens.stream().distinct().toList();
    }
}
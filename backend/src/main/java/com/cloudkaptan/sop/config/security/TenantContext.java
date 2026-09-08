package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.domain.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * ThreadLocal context holder for active tenant (corporate entity), authenticated user, 
 * security role, and organizational hierarchy access lists.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantContext {

    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

    private String userId;
    private String tenantId;
    private UserRole userRole;

    // New fields for organizational hierarchy
    @Builder.Default
    private List<String> readableSubordinateIds = new ArrayList<>();

    @Builder.Default
    private List<String> writableSubordinateIds = new ArrayList<>();

    public static void setContext(TenantContext context) {
        CONTEXT.set(context);
    }

    public static TenantContext getContext() {
        return CONTEXT.get();
    }

    public static String getCurrentUserId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.getUserId() : null;
    }

    public static String getCurrentTenantId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.getTenantId() : null;
    }

    public static UserRole getCurrentUserRole() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.getUserRole() : null;
    }

    public static void clear() {
        CONTEXT.remove();
    }
}

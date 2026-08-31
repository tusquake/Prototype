package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.domain.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ThreadLocal context holder for active tenant (corporate entity), authenticated user, and security role.
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

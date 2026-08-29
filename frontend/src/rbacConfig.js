export const ROLES = {
    ADMIN: 'ADMIN',
    EMPLOYEE: 'EMPLOYEE',
    DEMO: 'DEMO',
};

export const TAB_PERMISSIONS = {
    dashboard: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.DEMO],
    reports: [ROLES.ADMIN, ROLES.EMPLOYEE],
    settings: [ROLES.ADMIN],
    billing: [ROLES.ADMIN],
};

const USER_ROLE_MAP = {
    'mainak.gupta@cloudkaptan.com': ROLES.ADMIN,
    'john.doe@cloudkaptan.com': ROLES.EMPLOYEE,
};

export function getRoleForUser(user) {
    if (user.provider === 'demo') return ROLES.DEMO;

    return USER_ROLE_MAP[user.email] || ROLES.EMPLOYEE;
}

export function canAccessTab(userRole, tabId) {
    const allowedRoles = TAB_PERMISSIONS[tabId] || [];
    return allowedRoles.includes(userRole);
}
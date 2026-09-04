export const ROLES = {
  ADMIN: 'ADMIN',
  CHECKER: 'CHECKER',
  MAKER: 'MAKER',
  MAKER_CHECKER: 'MAKER_CHECKER',
  VIEWER: 'VIEWER',
};

export const PERMISSIONS = {
  '/dashboard': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/inbox': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/tasks': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/sops': [ROLES.ADMIN,ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/audit': [ROLES.ADMIN],
  '/access-control': [ROLES.ADMIN],
  '/categories': [ROLES.ADMIN],
};

const EMAIL_ROLE_MAP = {
  'manoj.agarwal@cloudkaptan.com': ROLES.ADMIN,
};

export function getRoleForEmail(email) {
  if (!email) return ROLES.VIEWER;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail.includes('manoj')) return ROLES.ADMIN;
  return ROLES.VIEWER;
}

export function hasPermission(userRole, route) {
  const allowedRoles = PERMISSIONS[route];
  if (!allowedRoles) return true;
  if (userRole === ROLES.ADMIN) return true;
  return allowedRoles.includes(userRole);
}
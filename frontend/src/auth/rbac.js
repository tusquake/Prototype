export const ROLES = {
  ADMIN: 'ADMIN',
  CHECKER: 'CHECKER',
  MAKER: 'MAKER',
  MAKER_CHECKER: 'MAKER_CHECKER',
  VIEWER: 'VIEWER',

};

export const PERMISSIONS = {
  '/dashboard': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/inbox': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER],
  '/tasks': [ROLES.ADMIN, ROLES.CHECKER, ROLES.MAKER, ROLES.MAKER_CHECKER, ROLES.VIEWER],
  '/sops': [ROLES.ADMIN],
  '/audit': [ROLES.ADMIN],
};

const EMAIL_ROLE_MAP = {
  'manoj.agarwal@cloudkaptan.com': ROLES.ADMIN,
  'vivek.raj@cloudkaptan.com': ROLES.MAKER_CHECKER,
  'mainak.gupta@cloudkaptan.com': ROLES.CHECKER,
  'tushar.seth@cloudkaptan.com': ROLES.MAKER,
  'avisek.shaw@cloudkaptan.com': ROLES.VIEWER,
  'apratim.raha@cloudkaptan.com': ROLES.VIEWER,
};

export function getRoleForEmail(email) {
  if (!email) return ROLES.VIEWER;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail.includes('manoj')) return ROLES.ADMIN;
  if (cleanEmail.includes('vivek')) return ROLES.MAKER_CHECKER;
  if (cleanEmail.includes('mainak')) return ROLES.CHECKER;
  if (cleanEmail.includes('tushar')) return ROLES.MAKER;
  if (cleanEmail.includes('avisek')) return ROLES.VIEWER;
  return EMAIL_ROLE_MAP[cleanEmail] || ROLES.VIEWER;
}

export function hasPermission(userRole, route) {
  const allowedRoles = PERMISSIONS[route];
  if (!allowedRoles) return true;
  if (userRole === ROLES.ADMIN) return true;
  return allowedRoles.includes(userRole);
}
import { getRoleForEmail, ROLES } from './rbac';

const GOOGLE_CLIENT_ID = '134019064582-5j9c1gvcl73k2bpp6p927u3d9q7uruoq.apps.googleusercontent.com';

export const USERS = [
  // Admins & existing core users
  { id: 'usr-manoj-042',  name: 'Manoj Agarwal',   email: 'manoj.agarwal@cloudkaptan.com',          role: 'ADMIN',        picture: '' },
  { id: 'usr-vivek-108',  name: 'Vivek Raj',        email: 'vivek.raj@cloudkaptan.com',              role: 'MAKER_CHECKER', picture: '' },
  { id: 'usr-mainak-215', name: 'Mainak Gupta',     email: 'mainak.gupta@cloudkaptan.com',           role: 'CHECKER',      picture: '' },
  { id: 'usr-tushar-304', name: 'Tushar Seth',      email: 'tushar.seth@cloudkaptan.com',            role: 'MAKER',        picture: '' },
  { id: 'usr-avisek-499', name: 'Avisek Shaw',      email: 'avisek.shaw@cloudkaptan.com',            role: 'VIEWER',       picture: '' },
  // 13 new VIEWER users (no access until admin grants permissions)
  { id: 'usr-anirban-001',  name: 'Anirban Paul',          email: 'anirban.paul@cloudkaptan.com',          role: 'VIEWER', picture: '' },
  { id: 'usr-annu-002',     name: 'Annu Shaw',             email: 'annu.shaw@cloudkaptan.com',             role: 'VIEWER', picture: '' },
  { id: 'usr-avisek2-003',  name: 'Avisek Shaw',           email: 'avisek.shaw@cloudkaptan.com',           role: 'VIEWER', picture: '' },
  { id: 'usr-ayush-004',    name: 'Ayush Pandey',          email: 'ayush.pandey@cloudkaptan.com',          role: 'VIEWER', picture: '' },
  { id: 'usr-debajyo-005',  name: 'Debajyoti Dattagupta',  email: 'debajyoti.dattagupta@cloudkaptan.com',  role: 'VIEWER', picture: '' },
  { id: 'usr-isha-006',     name: 'Isha Prasad',           email: 'isha.prasad@cloudkaptan.com',           role: 'VIEWER', picture: '' },
  { id: 'usr-king-007',     name: 'Kingshuk Roy',          email: 'kingshuk.roy@cloudkaptan.com',          role: 'VIEWER', picture: '' },
  { id: 'usr-moit-008',     name: 'Moitrayee Dutta',       email: 'moitrayee.dutta@cloudkaptan.com',       role: 'VIEWER', picture: '' },
  { id: 'usr-nishan-009',   name: 'Nishan Mandal',         email: 'nishan.mandal@cloudkaptan.com',         role: 'VIEWER', picture: '' },
  { id: 'usr-rounok-010',   name: 'Rounok Das',            email: 'rounok.das@cloudkaptan.com',            role: 'VIEWER', picture: '' },
  { id: 'usr-sanjeev-011',  name: 'Sanjeev Kumar',         email: 'sanjeev.kumar@cloudkaptan.com',         role: 'VIEWER', picture: '' },
  { id: 'usr-sayant-012',   name: 'Sayantan Ghosh',        email: 'sayantan.ghosh@cloudkaptan.com',        role: 'VIEWER', picture: '' },
  { id: 'usr-shreya-013',   name: 'Shreya Singh',          email: 'shreya.singh@cloudkaptan.com',          role: 'VIEWER', picture: '' },
];

function getRedirectUri() {
  return `${window.location.origin}/callback`;
}

function generateNonce() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildAuthUrl(extraParams = {}) {
  const nonce = generateNonce();
  sessionStorage.setItem('oauth_nonce', nonce);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'id_token',
    scope: 'openid profile email',
    nonce: nonce,
    prompt: 'select_account',
    ...extraParams,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function loginWithGoogle() {
  window.location.href = buildAuthUrl();
}

export function loginWithMicrosoftEntra() {
  const nonce = generateNonce();
  sessionStorage.setItem('oauth_nonce', nonce);
  const params = new URLSearchParams({
    client_id: '00000000-0000-0000-0000-000000000000',
    redirect_uri: getRedirectUri(),
    response_type: 'id_token',
    scope: 'openid profile email',
    response_mode: 'fragment',
    nonce: nonce,
    prompt: 'select_account',
  });
  window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export function loginWithCloudIdentity() {
  window.location.href = buildAuthUrl({ hd: 'cloudkaptan.com' });
}

export function saveSession(user, token) {
  const userWithRole = {
    ...user,
    role: user.role || getRoleForEmail(user.email),
  };
  localStorage.setItem('cloudkaptan_token', token || 'demo-token');
  localStorage.setItem('cloudkaptan_user', JSON.stringify(userWithRole));
}

export function getSession() {
  const token = localStorage.getItem('cloudkaptan_token');
  const raw = localStorage.getItem('cloudkaptan_user');
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('cloudkaptan_token');
  localStorage.removeItem('cloudkaptan_user');
  sessionStorage.removeItem('oauth_nonce');
}

export function parseGoogleToken(idToken) {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      console.error('OAuth Error: Token has expired.');
      return null;
    }

    const storedNonce = sessionStorage.getItem('oauth_nonce');
    if (storedNonce && payload.nonce !== storedNonce) {
      console.error('OAuth Security Warning: Nonce mismatch.');
      return null;
    }

    sessionStorage.removeItem('oauth_nonce');

    const email = payload.email || payload.upn || payload.preferred_username;

    return {
      name: payload.name || payload.given_name || email?.split('@')[0] || 'User',
      email: email,
      picture: payload.picture || '',
      provider: payload.iss?.includes('microsoft') ? 'entra_id' : (payload.hd === 'cloudkaptan.com' ? 'cloud_identity' : 'google'),
      role: getRoleForEmail(email),
    };
  } catch (error) {
    console.error('Failed to parse ID Token:', error);
    return null;
  }
}

export function loginAsDemoAdmin() {
  const user = USERS[0]; // Manoj Agarwal
  saveSession(user, 'demo-admin-token');
  return user;
}

export function loginAsDemoDual() {
  const user = USERS[1]; // Vivek Raj (Maker & Checker)
  saveSession(user, 'demo-dual-token');
  return user;
}

export function loginAsDemoChecker() {
  const user = USERS[2]; // Mainak Gupta (Checker)
  saveSession(user, 'demo-checker-token');
  return user;
}

export function loginAsDemoMaker() {
  const user = USERS[3]; // Tushar Seth (Maker)
  saveSession(user, 'demo-maker-token');
  return user;
}

export function loginAsDemoViewer() {
  const user = USERS[4]; // Avisek Shaw (Viewer)
  saveSession(user, 'demo-viewer-token');
  return user;
}

export function loginAsDemoManager() {
  return loginAsDemoChecker();
}

export function loginAsDemo() {
  return loginAsDemoAdmin();
}
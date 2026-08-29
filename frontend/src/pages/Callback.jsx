import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseGoogleToken, saveSession } from '../auth/auth';
import { verifyGoogleSsoToken } from '../services/api';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function processAuth() {
      const hash = window.location.hash;
      if (!hash) {
        navigate('/login', { replace: true });
        return;
      }

      const params = new URLSearchParams(hash.replace('#', ''));
      const idToken = params.get('id_token');

      if (!idToken) {
        navigate('/login', { replace: true });
        return;
      }

      // First try backend verification endpoint
      const serverRes = await verifyGoogleSsoToken(idToken);

      if (serverRes && serverRes.user) {
        saveSession(serverRes.user, serverRes.token);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Fallback client parsing
      const user = parseGoogleToken(idToken);
      if (user) {
        saveSession(user, idToken);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }

    processAuth();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: 'var(--text-muted, #666)',
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid var(--border, #ccc)',
          borderTopColor: 'var(--accent, #1a2b6b)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      Verifying Google SSO identity with Node backend...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
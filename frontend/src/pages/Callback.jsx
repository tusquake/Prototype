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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[13px] text-text-muted">
      <div className="w-6 h-6 border-2 border-[#cbd5e1] border-t-[#2563eb] rounded-full animate-spin" />
      Verifying Google SSO identity with Node backend...
    </div>
  );
}
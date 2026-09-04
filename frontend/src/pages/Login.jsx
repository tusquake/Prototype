import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loginWithGoogle,
  loginWithMicrosoftEntra,
  loginAsDemoAdmin,
  loginAsDemoDual,
  loginAsDemoChecker,
  loginAsDemoMaker,
  loginAsDemoViewer,
  saveSession,
  USERS,
} from '../auth/auth';

// All VIEWER-role users (for team member sign-in section)
const VIEWER_USERS = USERS.filter(u => u.role === 'VIEWER' && u.id !== 'usr-avisek-499');

function VectorDashField({ position = 'left' }) {
  const rows = 14;
  const cols = 12;
  const dashes = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * 26 + 20;
      const y = r * 26 + 20;
      const dx = c - cols / 2;
      const dy = r - rows / 2;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      const angle = position === 'left'
        ? (distFromCenter * 16 + r * 8 + c * 12) % 180 - 45
        : (distFromCenter * 20 - r * 14 + c * 8) % 180 - 30;

      const opacity = Math.max(0.12, 0.75 - distFromCenter * 0.07);
      dashes.push({ x, y, angle, opacity });
    }
  }

  return (
    <div className={`absolute w-[380px] h-[420px] pointer-events-none z-[1] opacity-85 hidden md:block ${
  position === 'left' ? 'top-[12%] left-[4%]' : 'bottom-[8%] right-[4%]'
}`}>
  <svg className="w-full h-full" viewBox="0 0 340 380" fill="none" xmlns="http://www.w3.org/2000/svg">
    {dashes.map((d, i) => (
      <line
        key={i}
        x1={d.x - 7} y1={d.y} x2={d.x + 7} y2={d.y}
        stroke={position === 'left' ? '#38bdf8' : '#60a5fa'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity={d.opacity}
        transform={`rotate(${d.angle}, ${d.x}, ${d.y})`}
      />
    ))}
  </svg>
</div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [selectedViewer, setSelectedViewer] = useState('');

  function handleGoogle() {
    setLoading('google');
    loginWithGoogle();
  }

  function handleEntra() {
    setLoading('entra');
    loginWithMicrosoftEntra();
  }

  function handleDemo(loginFn) {
    loginFn();
    navigate('/dashboard');
  }

  function handleViewerLogin() {
    if (!selectedViewer) return;
    const user = VIEWER_USERS.find(u => u.id === selectedViewer);
    if (user) {
      saveSession(user, `demo-viewer-token-${user.id}`);
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-10 px-6 bg-[radial-gradient(circle_at_18%_50%,#0c1c42_0%,#050b1a_55%,#02050e_100%)] relative overflow-hidden font-sans">
  {/* Vector Dash Fields */}
  <VectorDashField position="left" />
  <VectorDashField position="right" />

  {/* Ambient Radial Glow Orbs */}
  <div className="absolute top-[15%] -left-[5%] w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(29,78,216,0.28)_0%,rgba(56,189,248,0.09)_50%,transparent_70%)] blur-[65px] pointer-events-none z-0" />
  <div className="absolute bottom-[10%] -right-[5%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(37,99,235,0.22)_0%,rgba(96,165,250,0.06)_50%,transparent_70%)] blur-[55px] pointer-events-none z-0" />

  {/* Crisp Clean White Login Card */}
  <div className="bg-bg-surface border border-[#e2e8f0] rounded-[16px] p-10 w-full max-w-[400px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.1)] flex flex-col z-[2] relative">
    <div className="text-center mb-[28px]">
      <img src="/CLoudKaptan-logo.png" alt="CloudKaptan" className="h-[40px] w-auto object-contain mx-auto mb-2" />
      <p className="text-[11.5px] font-semibold text-text-muted uppercase tracking-[0.9px] mt-1">
        Finance SOP &amp; Compliance Platform
      </p>
    </div>

    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex items-center justify-center gap-[10px] px-5 py-[11px] bg-bg-surface text-[#1f2937] border border-[#d1d5db] rounded-[8px] font-medium text-[14px] transition-all duration-150 shadow-sm cursor-pointer hover:enabled:bg-[#f9fafb] hover:enabled:border-[#9ca3af] hover:enabled:shadow-md disabled:opacity-55 disabled:cursor-not-allowed"
        onClick={handleGoogle}
        disabled={!!loading}
      >
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.13C3.25 21.3 7.31 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.38l4.01-3.13z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4.01 3.13z" />
        </svg>
        {loading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
      </button>

      <button
        type="button"
        className="flex items-center justify-center gap-[10px] px-5 py-[11px] bg-bg-surface text-[#1f2937] border border-[#d1d5db] rounded-[8px] font-medium text-[14px] transition-all duration-150 shadow-sm cursor-pointer hover:enabled:bg-[#f9fafb] hover:enabled:border-[#9ca3af] hover:enabled:shadow-md disabled:opacity-55 disabled:cursor-not-allowed"
        onClick={handleEntra}
        disabled={!!loading}
      >
        <svg viewBox="0 0 21 21" width="18" height="18" className="shrink-0">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
        {loading === 'entra' ? 'Redirecting...' : 'Sign in with Microsoft Entra ID'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[#94a3b8] text-[10.5px] font-semibold uppercase tracking-[0.6px] my-2 before:content-[''] before:flex-1 before:h-[1px] before:bg-[#e2e8f0] after:content-[''] after:flex-1 after:h-[1px] after:bg-[#e2e8f0]">
        <span>or quick demo sign-in</span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="px-4 py-[10px] bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-[8px] text-[12.5px] font-medium cursor-pointer transition-all duration-150 text-left hover:enabled:bg-bg-surface hover:enabled:border-[#1a2b6b] hover:enabled:text-[#1a2b6b] hover:enabled:shadow-[0_2px_6px_rgba(26,43,107,0.08)] disabled:opacity-55 disabled:cursor-not-allowed"
          onClick={() => handleDemo(loginAsDemoAdmin)}
        >
          Sign in as Admin (Manoj Agarwal)
        </button>
        <button
          type="button"
          className="px-4 py-[10px] bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-[8px] text-[12.5px] font-medium cursor-pointer transition-all duration-150 text-left hover:enabled:bg-bg-surface hover:enabled:border-[#1a2b6b] hover:enabled:text-[#1a2b6b] hover:enabled:shadow-[0_2px_6px_rgba(26,43,107,0.08)] disabled:opacity-55 disabled:cursor-not-allowed"
          onClick={() => handleDemo(loginAsDemoViewer)}
        >
          Sign in as Viewer (Avisek Shaw)
        </button>
      </div>

      {/* Team Member Sign-in */}
      <div className="flex items-center gap-3 text-[#94a3b8] text-[10.5px] font-semibold uppercase tracking-[0.6px] my-2 before:content-[''] before:flex-1 before:h-[1px] before:bg-[#e2e8f0] after:content-[''] after:flex-1 after:h-[1px] after:bg-[#e2e8f0]">
        <span>sign in as team member</span>
      </div>

      <div className="flex gap-2 items-stretch">
        <select
          value={selectedViewer}
          onChange={e => setSelectedViewer(e.target.value)}
          className="flex-1 p-[10px_12px] rounded-[8px] border-[1.5px] border-[#cbd5e1] text-[13px] bg-[#f8fafc] text-text-primary outline-none cursor-pointer"
        >
          <option value="">— Select team member —</option>
          {VIEWER_USERS.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button
          type="button"
          className={`px-4 py-[10px] bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-[8px] text-[12.5px] font-medium cursor-pointer transition-all duration-150 text-left shrink-0 whitespace-nowrap hover:enabled:bg-bg-surface hover:enabled:border-[#1a2b6b] hover:enabled:text-[#1a2b6b] hover:enabled:shadow-[0_2px_6px_rgba(26,43,107,0.08)] ${
            selectedViewer ? 'opacity-100' : 'opacity-50'
          }`}
          onClick={handleViewerLogin}
          disabled={!selectedViewer}
        >
          Sign In
        </button>
      </div>
    </div>

    <div className="mt-6 text-center text-[11px] text-[#94a3b8] leading-[1.4]">
      Restricted access - CloudKaptan internal use only
    </div>
  </div>
</div>
  );
}
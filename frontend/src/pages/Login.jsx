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
} from '../auth/auth';
import styles from './Login.module.css';

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
    <div className={position === 'left' ? styles.dashWrapperLeft : styles.dashWrapperRight}>
      <svg
        className={styles.dashSvg}
        viewBox="0 0 340 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dashes.map((d, i) => (
          <line
            key={i}
            x1={d.x - 7}
            y1={d.y}
            x2={d.x + 7}
            y2={d.y}
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

  return (
    <div className={styles.page}>
      {/* Background Vector Dash Fields (Left & Right) */}
      <VectorDashField position="left" />
      <VectorDashField position="right" />

      {/* Ambient Glow Orbs */}
      <div className={styles.glowOrbLeft} />
      <div className={styles.glowOrbRight} />

      {/* White Clean Login Card Floating over Dark Tech Background */}
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/CLoudKaptan-logo.png" alt="CloudKaptan" className={styles.logo} />
          <p className={styles.brandSub}>Finance SOP &amp; Compliance Platform</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnGoogle} onClick={handleGoogle} disabled={!!loading}>
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.13C3.25 21.3 7.31 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.38l4.01-3.13z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4.01 3.13c.95-2.83 3.6-4.93 6.72-4.93z" />
            </svg>
            {loading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
          </button>

          <button className={styles.btnEntra} onClick={handleEntra} disabled={!!loading}>
            <svg viewBox="0 0 21 21" width="18" height="18" style={{ flexShrink: 0 }}>
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {loading === 'entra' ? 'Redirecting...' : 'Sign in with Microsoft Entra ID'}
          </button>

          <div className={styles.divider}><span>or quick demo sign-in</span></div>

          <div className={styles.demoButtons}>
            <button className={styles.btnDemo} onClick={() => handleDemo(loginAsDemoAdmin)}>
              Sign in as Admin (Manoj Agarwal)
            </button>
            <button className={styles.btnDemo} onClick={() => handleDemo(loginAsDemoDual)}>
              Sign in as Maker &amp; Checker (Vivek Raj)
            </button>
            <button className={styles.btnDemo} onClick={() => handleDemo(loginAsDemoChecker)}>
              Sign in as Checker (Mainak Gupta)
            </button>
            <button className={styles.btnDemo} onClick={() => handleDemo(loginAsDemoMaker)}>
              Sign in as Maker (Tushar Seth)
            </button>
            <button className={styles.btnDemo} onClick={() => handleDemo(loginAsDemoViewer)}>
              Sign in as Viewer (Avisek Shaw)
            </button>
          </div>
        </div>

        <div className={styles.footerNote}>
          Restricted access - CloudKaptan internal use only
        </div>
      </div>
    </div>
  );
}
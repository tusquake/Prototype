import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getSession, saveSession, USERS } from '../auth/auth';
import { hasPermission } from '../auth/rbac';
import NotificationBell from './NotificationBell';
import { getTasks } from '../services/api';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/inbox',
    label: 'My Inbox',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  {
    to: '/tasks',
    label: 'Task List',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    ),
  },
  {
    to: '/sops',
    label: 'SOP Management',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/audit',
    label: 'Audit Trail',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    to: '/access-control',
    label: 'Access Control',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    to: '/categories',
    label: 'Process Categories',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const session = getSession();
  const currentUser = session?.user ?? USERS[0];
  const [inboxCount, setInboxCount] = useState(0);

  if (!session) {
    saveSession(USERS[0], 'demo-token');
  }

  useEffect(() => {
    if (currentUser) {
      getTasks([], currentUser).then(tasks => {
        if (!Array.isArray(tasks)) return;
        const currentId = currentUser.id || currentUser.userId || '';
        const rawName = currentUser.name || '';
        const cleanName = rawName.split(' (')[0].trim().toLowerCase();
        const isAdmin = currentUser.role === 'ADMIN' || currentUser.email?.includes('mainak');

        function isMatch(personName, idList) {
          if (currentId && Array.isArray(idList) && idList.includes(currentId)) return true;
          if (!personName || !cleanName) return false;
          const cleanPerson = personName.toLowerCase().trim();
          return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
        }

        const pending = tasks.filter(t => {
          if (t.status === 'APPROVED' || t.status === 'PERMANENTLY_REJECTED') return false;
          if (isAdmin) return true;

          const isSopCreator = (t.sopCreatedBy && t.sopCreatedBy === currentId) ||
            (Array.isArray(t.sopAssignedCreatorIds) && t.sopAssignedCreatorIds.includes(currentId));
          const isSopApprover = Array.isArray(t.sopAssignedApproverIds) && t.sopAssignedApproverIds.includes(currentId);

          const isMakerPending = (t.status === 'OPEN' || t.status === 'REJECTED') &&
            (isMatch(t.makerName, t.assignedMakerIds) || isMatch(t.maker, t.assignedMakerIds) || isSopCreator || isSopApprover);

          const isCheckerPending = (t.status === 'PENDING_REVIEW') &&
            (isMatch(t.checkerName, t.assignedCheckerIds) || isMatch(t.checker, t.assignedCheckerIds) || isSopCreator || isSopApprover);

          return isMakerPending || isCheckerPending;
        });

        setInboxCount(pending.length);
      }).catch(() => {});
    }
  }, [currentUser]);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(currentUser.role, item.to)
  );

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[248px] flex-col bg-[#091124] text-white shadow-[2px_0_12px_rgba(0,0,0,0.15)]">
      {/* Header */}
      <div className="flex flex-col gap-1 px-5 pb-4 pt-6">
        <div className="flex items-center">
          <img src="/CLoudKaptan-logo.png" alt="CloudKaptan" className="h-7 w-auto object-contain brightness-0 invert" />
        </div>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">
          FINANCE SOP TRACKER
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px] font-medium transition-all ${isActive
                ? 'bg-blue-600 font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="flex items-center justify-center leading-none">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.to === '/inbox' && inboxCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                {inboxCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative flex flex-col gap-2.5 border-t border-white/10 px-3 pb-4 pt-3.5">
        <NotificationBell currentUser={currentUser} />

        {/* Logged in User Card */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="flex min-w-0 items-center gap-2.25 overflow-hidden">
            {currentUser.picture ? (
              <img src={currentUser.picture} alt="avatar" className="h-7.5 w-7.5 shrink-0 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-blue-600 text-xs font-bold text-white">
                {currentUser.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-50">{currentUser.name}</div>
              <div className="truncate text-[10px] text-slate-400" title={currentUser.email}>
                {currentUser.email}
              </div>
            </div>
          </div>
          <button
            className="flex shrink-0 items-center rounded p-1.5 text-slate-400 transition-all hover:bg-red-600/15 hover:text-red-400"
            onClick={handleLogout}
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
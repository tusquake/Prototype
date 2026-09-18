import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getSession, saveSession, USERS } from '../auth/auth';
import { hasPermission } from '../auth/rbac';
import { useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useState } from 'react';

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
  // {
  //   to: '/tasks',
  //   label: 'Task List',
  //   icon: (
  //     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  //       <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  //       <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  //       <path d="M9 12h6" />
  //       <path d="M9 16h6" />
  //     </svg>
  //   ),
  // },
  {
    label: 'SOP',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    children: [
      {
        to: '/sop-management',
        label: 'Management',
      },
      {
        to: '/sop-activity',
        label: 'Activity',
      },
    ]
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSopsOpen, setIsSopsOpen] = useState(false);
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (label) => {
    // If sidebar is collapsed, open it when a user clicks a group
    if (isCollapsed) setIsCollapsed(false);
    
    setOpenGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  // Highlight parent group if a child route is active
  const isSopsActive = location.pathname.includes('/sops');

  if (!session) {
    saveSession(USERS[0], 'demo-token');
  }

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(currentUser.role, item.to)
  );

  return (
    <aside
      className={`relative z-50 flex h-screen shrink-0 flex-col bg-[#091124] text-white shadow-[2px_0_12px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[80px]' : 'w-[248px]'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col gap-1 pb-4 pt-6 ${isCollapsed ? 'px-0 items-center' : 'px-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full`}>
          {!isCollapsed && (
            <img
              src="/CLoudKaptan-logo.png"
              alt="CloudKaptan"
              className="h-7 w-auto object-contain brightness-0 invert transition-all"
            />
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              {isCollapsed ? (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" /> // Chevrons Right
              ) : (
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /> // Chevrons Left
              )}
            </svg>
          </button>
        </div>
        {!isCollapsed && (
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-400 whitespace-nowrap">
            FINANCE SOP TRACKER
          </span>
        )}
      </div>

      {/* Navigation */}
     <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3">
        {visibleNavItems.map((item) => {
          
          // 1. IF ITEM HAS CHILDREN (Render Accordion Group)
          if (item.children && item.children.length > 0) {
            const isOpen = openGroups[item.label];
            // Highlight group if any child route is active
            const isGroupActive = item.children.some(child => location.pathname.includes(child.to));

            return (
              <div key={item.label} className="group relative mt-1">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px] font-medium transition-all ${
                    isGroupActive ? 'text-white font-semibold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center leading-none min-w-[20px]">
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  </div>
                  
                  {!isCollapsed && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-[60px] top-1/2 -translate-y-1/2 hidden rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white group-hover:block whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}

                {/* Sub-routes */}
                {(!isCollapsed && isOpen) && (
                  <div className="flex flex-col gap-1 mt-1 pl-9 pr-2">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${location.pathname === child.to ? 'bg-sky-400' : 'bg-slate-500'}`}></div>
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // 2. IF STANDARD ITEM (Render normal link)
          return (
            <div key={item.to} className="group relative">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px] font-medium transition-all ${
                    isActive ? 'bg-blue-600 font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
              >
                <span className="flex items-center justify-center leading-none min-w-[20px]">
                  {item.icon}
                </span>
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-[60px] top-1/2 -translate-y-1/2 hidden rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white group-hover:block whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`relative flex flex-col gap-2.5 border-t border-white/10 pb-4 pt-3.5 transition-all ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {/* Make sure your NotificationBell accepts and handles the isCollapsed prop if needed */}
        <NotificationBell currentUser={currentUser} isCollapsed={isCollapsed} />

        {/* Logged in User Card */}
        <div className={`flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
          <div className={`flex min-w-0 items-center overflow-hidden ${isCollapsed ? 'justify-center' : 'gap-2.25'}`}>
            {currentUser.picture ? (
              <img src={currentUser.picture} alt="avatar" className="h-7.5 w-7.5 shrink-0 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-blue-600 text-xs font-bold text-white">
                {currentUser.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-50">{currentUser.name}</div>
                <div className="truncate text-[10px] text-slate-400" title={currentUser.email}>
                  {currentUser.email}
                </div>
              </div>
            )}
          </div>

          <button
            className={`flex shrink-0 items-center rounded p-1.5 text-slate-400 transition-all hover:bg-red-600/15 hover:text-red-400 ${isCollapsed ? 'mt-2' : ''}`}
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
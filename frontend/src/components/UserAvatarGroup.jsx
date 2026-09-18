import React, { useState, useRef, useEffect } from 'react';
import Tooltip from './Tooltip';

export default function UserAvatarGroup({ users, max = 4, isPending = false }) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!users || users.length === 0) {
    return (
      <span className={isPending ? 'text-[#94a3b8] italic text-[12px]' : 'text-[#1e293b]'}>
        —
      </span>
    );
  }

  const visibleUsers = users.slice(0, max);
  const remainingUsers = users.slice(max);

  return (
    <div className={`flex items-center ${isPending ? 'opacity-60 grayscale' : ''}`}>
      {visibleUsers.map((name, idx) => (
        // Added 'group' here to trigger the tooltip on hover
        <div key={idx} className={`group relative flex ${idx !== 0 ? '-ml-2' : ''}`}>
          
          {/* Avatar Circle */}
          <div className="relative flex h-7 w-7 cursor-default items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[10px] font-bold text-blue-700 shadow-sm transition-transform hover:z-10 hover:scale-110">
            {getInitials(name)}
          </div>

          {/* Instant Custom Tooltip */}
          <Tooltip name={name} />
        </div>
      ))}

      {/* Info icon for remaining users */}
      {remainingUsers.length > 0 && (
        <div className="relative ml-1" ref={popoverRef}>
          <button
            type="button"
            onClick={(e) => {e.stopPropagation(),setShowPopover(!showPopover) }}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm transition-colors hover:bg-slate-200"
            title={`${remainingUsers.length} more users`} 
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          {/* Popover List */}
          {showPopover && (
            <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl animate-[fadeIn_0.15s_ease-out]">
              <div className="mb-1 border-b border-slate-100 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Remaining Users
              </div>
              <ul className="max-h-32 overflow-y-auto pr-1">
                {remainingUsers.map((name, idx) => (
                  <li key={idx} className="flex items-center gap-2 py-1.5 text-xs font-medium text-slate-700">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[8px] font-bold text-blue-600">
                      {getInitials(name)}
                    </div>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
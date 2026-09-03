import { useState, useEffect } from 'react';
import { getUsers } from '../services/api';

export default function UserPickerModal({
  isOpen,
  title = 'Select Users',
  entityCode = null,
  targetRole = null,
  selectedUserIds = [],
  permittedUsers = null, // when set, only show these users (permission-filtered)
  onClose,
  onConfirm,
  onSelect,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState(selectedUserIds);

  const ID_MAP = {
    'Tushar Seth': 'usr-tushar-304',
    'Prayasa Sharma': 'usr-prayasa-410',
    'Vivek Raj': 'usr-vivek-108',
    'Mainak Gupta': 'usr-mainak-215',
    'Manoj Agarwal': 'usr-manoj-042',
    'usr-tushar': 'usr-tushar-304',
    'usr-prayasa': 'usr-prayasa-410',
    'usr-vivek': 'usr-vivek-108',
    'usr-mainak': 'usr-mainak-215',
    'usr-manoj': 'usr-manoj-042',
  };

  useEffect(() => {
    if (isOpen) {
      // Normalize selectedUserIds to standard IDs
      const normalized = (selectedUserIds || []).map(id => ID_MAP[id] || id);
      setTempSelected(normalized);
      loadApiUsers();
    }
  }, [isOpen, selectedUserIds, entityCode, targetRole, permittedUsers]);

  async function loadApiUsers() {
    setLoading(true);
    try {
      // If permittedUsers is provided, skip the API call and use them directly
      if (permittedUsers !== null) {
        setUsers(permittedUsers);
        return;
      }
      const eligibleUsers = await getUsers(entityCode, targetRole);
      setUsers(eligibleUsers);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  function isUserSelected(user) {
    const stdId = ID_MAP[user.name] || user.id;
    return tempSelected.includes(stdId) || tempSelected.includes(user.id) || tempSelected.includes(user.name);
  }

  function toggleUser(user) {
    const targetId = user.id || ID_MAP[user.name] || user.name;
    setTempSelected(prev => {
      const selected = isUserSelected(user);
      if (selected) {
        if (prev.length <= 1) return prev; // Keep at least 1 user selected
        return prev.filter(x => x !== targetId && x !== user.id && x !== user.name && x !== ID_MAP[user.name]);
      }
      return Array.from(new Set([...prev, targetId]));
    });
  }

  function handleSelectAll() {
    setTempSelected(filteredUsers.map(u => u.id));
  }

  function handleClearAll() {
    if (filteredUsers.length > 0) {
      setTempSelected([filteredUsers[0].id]);
    }
  }

  function handleConfirm() {
    if (onConfirm) onConfirm(tempSelected);
    if (onSelect) onSelect(tempSelected);
    onClose();
  }

  return (
    <div 
  className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#091124]/65 p-6 backdrop-blur-md" 
  onClick={onClose}
>
  <div 
    className="flex max-h-[85vh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[modalSlideIn_0.2s_cubic-bezier(0.16,1,0.3,1)]" 
    onClick={e => e.stopPropagation()}
  >
    {/* Header */}
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="mt-0.25 text-xs text-white/85">OIDC Group Claims: Filtered by {entityCode || 'All Entities'} ({targetRole || 'Eligible'})</p>
        </div>
      </div>
      <button 
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white transition-all hover:bg-white/30" 
        onClick={onClose}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    {/* Search Bar & Quick Actions */}
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 transition-all focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/15">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search eligible users by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoFocus
          className="w-full border-none bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        {searchTerm && (
          <button className="flex p-0.5 text-slate-400 transition-colors hover:text-slate-900" onClick={() => setSearchTerm('')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSelectAll} className="text-xs font-semibold text-slate-500 hover:text-blue-600 hover:underline">Select All</button>
          <span className="text-[10px] text-slate-300">•</span>
          <button type="button" onClick={handleClearAll} className="text-xs font-semibold text-slate-500 hover:text-blue-600 hover:underline">Reset</button>
        </div>
      </div>
    </div>

    {/* User List */}
    <div className="flex min-h-[220px] max-h-[340px] flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-xs text-slate-500">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
          </svg>
          <span>Verifying OIDC group permissions via API...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-center text-xs text-slate-500">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>No eligible users with group claim "fin_sop_{(entityCode||'').toLowerCase()}_{(targetRole||'').toLowerCase()}" found.</span>
        </div>
      ) : (
        filteredUsers.map(user => {
          const isChecked = isUserSelected(user);
          return (
            <div
              key={user.id || user.name}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all cursor-pointer ${
                isChecked
                  ? 'border-blue-600/20 bg-blue-600/[0.06] hover:bg-blue-600/[0.10]'
                  : 'border-transparent hover:bg-slate-100'
              }`}
              onClick={() => toggleUser(user)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-all ${
                    isChecked
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-[#091124]/15 bg-[#091124] text-xs font-bold text-white">
                  {user.name[0]?.toUpperCase() ?? 'U'}
                </div>

                <div className="flex flex-col">
                  <div className="text-[13.5px] font-semibold text-slate-900">{user.name}</div>
                  <div className="text-[11.5px] text-slate-500">{user.email}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Footer */}
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
      <button 
        type="button" 
        className="rounded-lg border border-slate-300 bg-white px-4.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900" 
        onClick={onClose}
      >
        Cancel
      </button>
      <button 
        type="button" 
        className="inline-flex items-center gap-1.75 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700" 
        onClick={handleConfirm}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Assign Selected Users</span>
      </button>
    </div>
  </div>
</div>
  );
}

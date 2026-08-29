import { useState, useEffect } from 'react';
import { getUsers } from '../services/api';
import styles from './UserPickerModal.module.css';

export default function UserPickerModal({
  isOpen,
  title = 'Select Users',
  entityCode = null,
  targetRole = null,
  selectedUserIds = [],
  onClose,
  onConfirm,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState(selectedUserIds);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedUserIds);
      loadApiUsers();
    }
  }, [isOpen, entityCode, targetRole]);

  async function loadApiUsers() {
    setLoading(true);
    try {
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

  function toggleUser(id) {
    setTempSelected(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least 1 user selected
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
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
    onConfirm(tempSelected);
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3>{title}</h3>
              <p>OIDC Group Claims: Filtered by {entityCode || 'All Entities'} ({targetRole || 'Eligible'})</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Bar & Quick Actions */}
        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
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
            />
            {searchTerm && (
              <button className={styles.clearSearchBtn} onClick={() => setSearchTerm('')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.quickActions}>
            <div className={styles.actionLinks}>
              <button type="button" onClick={handleSelectAll} className={styles.linkBtn}>Select All</button>
              <span className={styles.divider}>•</span>
              <button type="button" onClick={handleClearAll} className={styles.linkBtn}>Reset</button>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className={styles.userListScroll}>
          {loading ? (
            <div className={styles.loadingState}>
              <svg className={styles.spinner} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
              <span>Verifying OIDC group permissions via API...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>No eligible users with group claim "fin_sop_{(entityCode||'').toLowerCase()}_{(targetRole||'').toLowerCase()}" found.</span>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isChecked = tempSelected.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={`${styles.userRow} ${isChecked ? styles.userRowSelected : ''}`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div className={styles.userRowLeft}>
                    <div className={`${styles.checkbox} ${isChecked ? styles.checkboxChecked : ''}`}>
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    <div className={styles.avatar}>
                      {user.name[0]?.toUpperCase() ?? 'U'}
                    </div>

                    <div className={styles.userMeta}>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.submitBtn} onClick={handleConfirm}>
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

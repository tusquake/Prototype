import { useState, useEffect } from 'react';
import { updateProcessCategory, getCategoryActivityLogs } from '../services/api';
import styles from './SopDetailModal.module.css';

export default function ProcessCategoryDetailModal({ isOpen, category, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('DETAILS'); // 'DETAILS' | 'ACTIVITY'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.categoryName || '');
      setDescription(category.description || '');
      setErrorMsg('');
      setSuccessMsg('');
      if (activeTab === 'ACTIVITY') {
        fetchLogs(category.categoryCode);
      }
    }
  }, [category, activeTab]);

  if (!isOpen || !category) return null;

  async function fetchLogs(code) {
    setLoadingLogs(true);
    try {
      const data = await getCategoryActivityLogs(code);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateProcessCategory(category.categoryCode, {
        categoryCode: category.categoryCode,
        categoryName: name.trim(),
        description: description.trim(),
      });
      setSuccessMsg('Process Category updated successfully.');
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update process category:', err);
      setErrorMsg(err.message || 'Failed to update process category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header matching SopDetailModal */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3>Category: {category.categoryName}</h3>
            <div className={styles.badges}>
              <span className={styles.codeBadge}>{category.categoryCode}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Icon Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'DETAILS' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'DETAILS' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'DETAILS' ? 700 : 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Category Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVITY')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ACTIVITY' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'ACTIVITY' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'ACTIVITY' ? 700 : 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Activity Log
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {errorMsg && <div style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{errorMsg}</div>}
          {successMsg && <div style={{ color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{successMsg}</div>}

          {/* Tab 1: Category Details Form */}
          {activeTab === 'DETAILS' && (
            <form id="category-edit-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className={styles.field}>
                <span className={styles.label}>Category Code (Read-Only)</span>
                <span className={styles.codeBadge} style={{ width: 'fit-content', marginTop: 4 }}>{category.categoryCode}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Category Name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box' }}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Description</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#ffffff', color: '#0f172a', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </form>
          )}

          {/* Tab 2: Activity Log Timeline */}
          {activeTab === 'ACTIVITY' && (
            <div style={{ minHeight: 220 }}>
              {loadingLogs ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Loading activity logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No activity logs recorded for this category yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {logs.map((logItem, idx) => (
                    <div
                      key={logItem.id || idx}
                      style={{
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                          {logItem.action}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {logItem.timestamp ? new Date(logItem.timestamp).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                        {logItem.details || `Performed ${logItem.action}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        Actor: <strong style={{ color: '#334155' }}>{logItem.actorName || logItem.actorId}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer matching SopDetailModal */}
        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            {activeTab === 'DETAILS' ? 'Cancel' : 'Close'}
          </button>
          {activeTab === 'DETAILS' && (
            <button
              type="submit"
              form="category-edit-form"
              className={styles.btnPrimary}
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

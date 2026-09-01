import { useState, useEffect } from 'react';
import { updateProcessCategory, getCategoryActivityLogs } from '../services/api';
import Toast from './Toast';
import styles from './SopDetailModal.module.css';

export default function ProcessCategoryDetailModal({ isOpen, category, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('DETAILS'); // 'DETAILS' | 'ACTIVITY'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.categoryName || '');
      setDescription(category.description || '');
      setErrorMsg('');
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

    try {
      await updateProcessCategory(category.categoryCode, {
        categoryCode: category.categoryCode,
        categoryName: name.trim(),
        description: description.trim(),
      });
      if (onUpdated) onUpdated(`Process Category '${category.categoryCode}' updated successfully.`);
      onClose();
    } catch (err) {
      console.error('Failed to update process category:', err);
      setErrorMsg(err.message || 'Failed to update process category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        
        {/* Header matching SopDetailModal */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3>Process Category: {category.categoryName}</h3>
            <div className={styles.badges}>
              <span className={styles.codeBadge}>{category.categoryCode}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Icon-Tabs Header Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'DETAILS' ? '2.5px solid #0284c7' : '2.5px solid transparent',
              color: activeTab === 'DETAILS' ? '#0284c7' : '#64748b',
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
              borderBottom: activeTab === 'ACTIVITY' ? '2.5px solid #0284c7' : '2.5px solid transparent',
              color: activeTab === 'ACTIVITY' ? '#0284c7' : '#64748b',
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
          {/* Tab 1: Category Details Form */}
          {activeTab === 'DETAILS' && (
            <form id="category-edit-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className={styles.field}>
                <span className={styles.label}>Category Code (Read-Only)</span>
                <input
                  type="text"
                  value={category.categoryCode}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f1f5f9',
                    color: '#0284c7',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Category Name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter Category Name"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Description</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter category scope and description"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </form>
          )}

          {/* Tab 2: Activity Log History */}
          {activeTab === 'ACTIVITY' && (
            <div>
              {loadingLogs ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Loading category activity history...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No activity logged for this category yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {logs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: '#1e293b', marginTop: 2, lineHeight: 1.4 }}>
                        {log.details}
                      </div>

                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Performed by: <span style={{ fontWeight: 600, color: '#475569' }}>{log.actorName || log.actorId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer matching SopDetailModal */}
        <div className={styles.footer} style={{ justifyContent: 'flex-end' }}>
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

        {/* Floating Toast Notifications for Errors */}
        <Toast
          message={errorMsg}
          type="error"
          onClose={() => setErrorMsg('')}
        />

      </div>
    </div>
  );
}

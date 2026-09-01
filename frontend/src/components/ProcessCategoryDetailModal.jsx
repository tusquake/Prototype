import { useState, useEffect } from 'react';
import { updateProcessCategory, getCategoryActivityLogs } from '../services/api';

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
      await updateProcessCategory(category.id, {
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', border: '1px solid #e2e8f0' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Category: {category.categoryName}
            </h3>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#0284c7', fontWeight: 600, display: 'inline-block', marginTop: 2 }}>
              Code: {category.categoryCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', fontSize: 14, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {/* Icon Filter Tabs Bar */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'DETAILS' ? '2px solid #0284c7' : '2px solid transparent',
              color: activeTab === 'DETAILS' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'DETAILS' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Category Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVITY')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ACTIVITY' ? '2px solid #0284c7' : '2px solid transparent',
              color: activeTab === 'ACTIVITY' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'ACTIVITY' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Activity Log
          </button>
        </div>

        {errorMsg && <div style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{successMsg}</div>}

        {/* Tab 1: Category Details Form */}
        {activeTab === 'DETAILS' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Category Code (Read-Only)
              </label>
              <input
                type="text"
                value={category.categoryCode}
                disabled
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f1f5f9', color: '#475569', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Category Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#ffffff', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#ffffff', color: '#0f172a', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 18px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Activity Log Timeline from Dedicated Table */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0', maxHeight: 320, overflowY: 'auto' }}>
                {logs.map((logItem, idx) => (
                  <div
                    key={logItem.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        {logItem.action}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {logItem.timestamp ? new Date(logItem.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                      {logItem.details || `Performed ${logItem.action}`}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Performed by: <strong style={{ color: '#334155' }}>{logItem.actorName || logItem.actorId}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

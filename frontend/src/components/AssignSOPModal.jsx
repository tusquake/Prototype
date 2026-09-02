import { useState, useEffect, useCallback } from 'react';
import { assignSop, getProcessCategories, getUsersByPermission } from '../services/api';
import styles from './SopDetailModal.module.css';

const ENTITY_OPTIONS = [
  { value: 'CK_INDIA', label: 'CK India' },
  { value: 'CK_US', label: 'CK US' },
  { value: 'CK_UK', label: 'CK UK' },
  { value: 'CK_AUSTRALIA', label: 'CK Australia' },
];

export default function AssignSOPModal({ isOpen, onClose, onSuccess }) {
  const [processOptions, setProcessOptions] = useState([]);
  const [assignForm, setAssignForm] = useState({
    sopCode: '',
    entityCode: 'CK_INDIA',
    processCategory: '',
    assignedCreatorIds: [],   // multi-select
    assignedApproverId: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Permitted user lists (filtered by permission for selected category)
  const [permittedCreators, setPermittedCreators] = useState([]);
  const [permittedApprovers, setPermittedApprovers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load categories once
  useEffect(() => {
    getProcessCategories()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data.map(c => ({
            value: c.categoryName || c.categoryCode,
            label: c.categoryName || c.categoryCode,
          }));
          setProcessOptions(opts);
          setAssignForm(prev => ({ ...prev, processCategory: opts[0].value }));
        }
      })
      .catch(() => null);
  }, []);

  // Load permitted users whenever processCategory changes
  const loadPermittedUsers = useCallback(async (category) => {
    if (!category) return;
    setLoadingUsers(true);
    setPermittedCreators([]);
    setPermittedApprovers([]);
    setAssignForm(prev => ({ ...prev, assignedCreatorIds: [], assignedApproverId: '' }));
    try {
      const [creators, approvers] = await Promise.all([
        getUsersByPermission(category, 'CREATOR'),
        getUsersByPermission(category, 'APPROVER'),
      ]);
      setPermittedCreators(creators || []);
      setPermittedApprovers(approvers || []);
    } catch {
      setPermittedCreators([]);
      setPermittedApprovers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && assignForm.processCategory) {
      loadPermittedUsers(assignForm.processCategory);
    }
  }, [isOpen, assignForm.processCategory, loadPermittedUsers]);

  if (!isOpen) return null;

  function toggleCreator(userId) {
    setAssignForm(prev => {
      const ids = prev.assignedCreatorIds.includes(userId)
        ? prev.assignedCreatorIds.filter(id => id !== userId)
        : [...prev.assignedCreatorIds, userId];
      return { ...prev, assignedCreatorIds: ids };
    });
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!assignForm.sopCode.trim()) {
      setErrorMsg('SOP Code is required.');
      return;
    }
    if (assignForm.assignedCreatorIds.length === 0) {
      setErrorMsg('Please select at least one SOP Creator.');
      return;
    }
    if (!assignForm.assignedApproverId) {
      setErrorMsg('Please select a SOP Approver.');
      return;
    }

    try {
      setSaving(true);
      await assignSop({
        sopCode: assignForm.sopCode,
        entityCode: assignForm.entityCode,
        processCategory: assignForm.processCategory,
        assignedCreatorIds: assignForm.assignedCreatorIds,
        assignedCreatorId: assignForm.assignedCreatorIds[0], // primary (backward compat)
        assignedApproverId: assignForm.assignedApproverId,
      });
      window.dispatchEvent(new Event('sop-updated'));
      if (onSuccess) onSuccess('SOP assigned successfully!');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign SOP');
    } finally {
      setSaving(false);
    }
  }

  const noCreatorsMsg = loadingUsers
    ? 'Loading permitted creators…'
    : permittedCreators.length === 0
      ? 'No users have SOP Creator access for this category. Go to Access Control to grant access.'
      : null;

  const noApproversMsg = loadingUsers
    ? 'Loading permitted approvers…'
    : permittedApprovers.length === 0
      ? 'No users have SOP Approver access for this category. Go to Access Control to grant access.'
      : null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3 style={{ margin: 0 }}>Assign New SOP</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Creator & approver lists show only users with the required permissions for the selected category.
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {errorMsg && (
            <div style={{ color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {errorMsg}
            </div>
          )}

          <form id="assign-sop-form" onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* SOP Code */}
            <div className={styles.field}>
              <span className={styles.label}>SOP Code *</span>
              <input
                type="text"
                placeholder="e.g. SOP-TAX-2026-005"
                value={assignForm.sopCode}
                onChange={e => setAssignForm(prev => ({ ...prev, sopCode: e.target.value }))}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Entity */}
            <div className={styles.field}>
              <span className={styles.label}>Entity *</span>
              <select
                value={assignForm.entityCode}
                onChange={e => setAssignForm(prev => ({ ...prev, entityCode: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              >
                {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Process Category */}
            <div className={styles.field}>
              <span className={styles.label}>Process Category *</span>
              <select
                value={assignForm.processCategory}
                onChange={e => setAssignForm(prev => ({ ...prev, processCategory: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              >
                {processOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* SOP Creators — multi-select checkboxes */}
            <div className={styles.field}>
              <span className={styles.label}>
                Assign SOP Creators *
                <span style={{ marginLeft: 6, fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                  (multi-select — only users with canCreateSop for this category)
                </span>
              </span>
              {noCreatorsMsg ? (
                <div style={{ padding: '10px 14px', border: '1px dashed #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', background: '#f8fafc' }}>
                  {noCreatorsMsg}
                </div>
              ) : (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, maxHeight: 160, overflowY: 'auto', background: '#fff' }}>
                  {permittedCreators.map(u => (
                    <label
                      key={u.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                        cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                        background: assignForm.assignedCreatorIds.includes(u.id) ? '#eff6ff' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignForm.assignedCreatorIds.includes(u.id)}
                        onChange={() => toggleCreator(u.id)}
                        style={{ accentColor: '#3b82f6', width: 15, height: 15 }}
                      />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1e293b' }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{u.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {assignForm.assignedCreatorIds.length > 0 && (
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
                  ✓ {assignForm.assignedCreatorIds.length} creator(s) selected
                </div>
              )}
            </div>

            {/* SOP Approver — single select */}
            <div className={styles.field}>
              <span className={styles.label}>
                Assign SOP Approver *
                <span style={{ marginLeft: 6, fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                  (only users with canApproveSop for this category)
                </span>
              </span>
              {noApproversMsg ? (
                <div style={{ padding: '10px 14px', border: '1px dashed #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', background: '#f8fafc' }}>
                  {noApproversMsg}
                </div>
              ) : (
                <select
                  value={assignForm.assignedApproverId}
                  onChange={e => setAssignForm(prev => ({ ...prev, assignedApproverId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
                >
                  <option value="">— Select Approver —</option>
                  {permittedApprovers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.footer} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" form="assign-sop-form" className={styles.btnPrimary} disabled={saving || loadingUsers}>
            {saving ? 'Assigning…' : 'Assign SOP'}
          </button>
        </div>
      </div>
    </div>
  );
}

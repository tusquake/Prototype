import { useState, useEffect, useCallback } from 'react';
import UserPickerModal from './UserPickerModal';
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
    assignedCreatorIds: [],
    assignedApproverId: '',
  });
  const [showCreatorPicker, setShowCreatorPicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);
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

  function removeCreator(userId) {
    setAssignForm(prev => ({
      ...prev,
      assignedCreatorIds: prev.assignedCreatorIds.filter(id => id !== userId),
    }));
  }

  function removeApprover() {
    setAssignForm(prev => ({
      ...prev,
      assignedApproverId: '',
    }));
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

  const selectedApproverObj = assignForm.assignedApproverId
    ? permittedApprovers.find(x => x.id === assignForm.assignedApproverId) || { id: assignForm.assignedApproverId, name: assignForm.assignedApproverId }
    : null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <h3 style={{ margin: 0 }}>Assign New SOP</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Creator & approver lists show only users with required permissions for the selected category.
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

              {/* SOP Creators — UserPicker Modal Trigger + Badges */}
              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={styles.label} style={{ margin: 0 }}>
                    Assign SOP Creators *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreatorPicker(true)}
                    disabled={loadingUsers || permittedCreators.length === 0}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 6,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: (loadingUsers || permittedCreators.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (loadingUsers || permittedCreators.length === 0) ? 0.6 : 1,
                    }}
                  >
                    Select Creators ({assignForm.assignedCreatorIds.length})
                  </button>
                </div>

                {noCreatorsMsg ? (
                  <div style={{ padding: '10px 14px', border: '1px dashed #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', background: '#f8fafc' }}>
                    {noCreatorsMsg}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    minHeight: 42,
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}>
                    {assignForm.assignedCreatorIds.length === 0 ? (
                      <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No creators selected — click "Select Creators" above</span>
                    ) : (
                      assignForm.assignedCreatorIds.map(id => {
                        const u = permittedCreators.find(x => x.id === id) || { id, name: id };
                        return (
                          <div
                            key={id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 16,
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <span>{u.name || id}</span>
                            <button
                              type="button"
                              onClick={() => removeCreator(id)}
                              title="Remove creator"
                              style={{
                                border: 'none',
                                background: 'rgba(100, 116, 139, 0.18)',
                                color: '#475569',
                                borderRadius: '50%',
                                width: 16,
                                height: 16,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* SOP Approver — UserPicker Modal Trigger + Badge */}
              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={styles.label} style={{ margin: 0 }}>
                    Assign SOP Approver *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowApproverPicker(true)}
                    disabled={loadingUsers || permittedApprovers.length === 0}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 6,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: (loadingUsers || permittedApprovers.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (loadingUsers || permittedApprovers.length === 0) ? 0.6 : 1,
                    }}
                  >
                    Select Approver ({assignForm.assignedApproverId ? 1 : 0})
                  </button>
                </div>

                {noApproversMsg ? (
                  <div style={{ padding: '10px 14px', border: '1px dashed #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', background: '#f8fafc' }}>
                    {noApproversMsg}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    minHeight: 42,
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}>
                    {!selectedApproverObj ? (
                      <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No approver selected — click "Select Approver" above</span>
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 16,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <span>{selectedApproverObj.name || selectedApproverObj.id}</span>
                        <button
                          type="button"
                          onClick={removeApprover}
                          title="Remove approver"
                          style={{
                            border: 'none',
                            background: 'rgba(100, 116, 139, 0.18)',
                            color: '#475569',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
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

      {/* UserPickerModal for SOP Creators */}
      <UserPickerModal
        isOpen={showCreatorPicker}
        title="Select Assigned SOP Creators"
        selectedUserIds={assignForm.assignedCreatorIds}
        permittedUsers={permittedCreators}
        onClose={() => setShowCreatorPicker(false)}
        onConfirm={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedCreatorIds: selectedIds }));
          setShowCreatorPicker(false);
        }}
        onSelect={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedCreatorIds: selectedIds }));
          setShowCreatorPicker(false);
        }}
      />

      {/* UserPickerModal for SOP Approver */}
      <UserPickerModal
        isOpen={showApproverPicker}
        title="Select Assigned SOP Approver"
        selectedUserIds={assignForm.assignedApproverId ? [assignForm.assignedApproverId] : []}
        permittedUsers={permittedApprovers}
        onClose={() => setShowApproverPicker(false)}
        onConfirm={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedApproverId: selectedIds[0] || '' }));
          setShowApproverPicker(false);
        }}
        onSelect={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedApproverId: selectedIds[0] || '' }));
          setShowApproverPicker(false);
        }}
      />
    </>
  );
}

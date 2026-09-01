import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { assignSop, getProcessCategories } from '../services/api';
import styles from './SopDetailModal.module.css';

const ENTITY_OPTIONS = [
  { value: 'CK_INDIA', label: 'CK India' },
  { value: 'CK_US', label: 'CK US' },
  { value: 'CK_UK', label: 'CK UK' },
  { value: 'CK_AUSTRALIA', label: 'CK Australia' },
];

const DEFAULT_PROCESS_OPTIONS = [
  { value: 'Tax Compliance', label: 'Tax Compliance' },
  { value: 'Treasury & Cash Management', label: 'Treasury & Cash Management' },
  { value: 'Financial Reporting', label: 'Financial Reporting' },
  { value: 'Fixed Assets', label: 'Fixed Assets' },
  { value: 'Payroll & Statutory', label: 'Payroll & Statutory' },
];

const CREATOR_OPTIONS = [
  { value: 'usr-tushar-304', label: 'Tushar Seth (usr-tushar-304)' },
  { value: 'usr-prayasa-410', label: 'Prayasa Sharma (usr-prayasa-410)' },
  { value: 'usr-vivek-108', label: 'Vivek Raj (usr-vivek-108)' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta (usr-mainak-215)' },
];

const APPROVER_OPTIONS = [
  { value: 'usr-vivek-108', label: 'Vivek Raj (usr-vivek-108)' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta (usr-mainak-215)' },
  { value: 'usr-manoj-042', label: 'Manoj Agarwal (usr-manoj-042)' },
  { value: 'usr-avisek-499', label: 'Avisek Paul (usr-avisek-499)' },
];

export default function AssignSOPModal({ isOpen, onClose, onSuccess }) {
  const [processOptions, setProcessOptions] = useState(DEFAULT_PROCESS_OPTIONS);
  const [assignForm, setAssignForm] = useState({
    sopCode: '',
    entityCode: 'CK_INDIA',
    processCategory: 'Tax Compliance',
    assignedCreatorId: 'usr-tushar-304',
    assignedApproverId: 'usr-vivek-108',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getProcessCategories()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data.map(c => ({
            value: c.categoryName || c.categoryCode,
            label: c.categoryName || c.categoryCode,
          }));
          setProcessOptions(opts);
          if (opts.length > 0) {
            setAssignForm(prev => ({ ...prev, processCategory: opts[0].value }));
          }
        }
      })
      .catch(() => null);
  }, []);

  if (!isOpen) return null;

  async function handleAssignSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!assignForm.sopCode.trim()) {
      setErrorMsg('SOP Code is required.');
      return;
    }

    try {
      setSaving(true);
      await assignSop(assignForm);
      window.dispatchEvent(new Event('sop-updated'));
      if (onSuccess) onSuccess('SOP assigned successfully!');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign SOP');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3 style={{ margin: 0 }}>Assign New SOP</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
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
            <div className={styles.field}>
              <span className={styles.label}>SOP Code *</span>
              <input
                type="text"
                placeholder="e.g. SOP-TAX-2026-005"
                value={assignForm.sopCode}
                onChange={e => setAssignForm(prev => ({ ...prev, sopCode: e.target.value }))}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, background: '#ffffff', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Entity *</span>
              <CustomSelect
                value={assignForm.entityCode}
                options={ENTITY_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, entityCode: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Process Category *</span>
              <CustomSelect
                value={assignForm.processCategory}
                options={processOptions}
                onChange={e => setAssignForm(prev => ({ ...prev, processCategory: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Assign SOP Creator *</span>
              <CustomSelect
                value={assignForm.assignedCreatorId}
                options={CREATOR_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, assignedCreatorId: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Assign SOP Approver *</span>
              <CustomSelect
                value={assignForm.assignedApproverId}
                options={APPROVER_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, assignedApproverId: e.target.value }))}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.footer} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="assign-sop-form" className={styles.btnPrimary} disabled={saving}>
            {saving ? 'Assigning...' : 'Assign SOP'}
          </button>
        </div>

      </div>
    </div>
  );
}

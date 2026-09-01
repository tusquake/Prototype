import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { assignSop, getProcessCategories } from '../services/api';
import styles from '../pages/Sops.module.css';

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
      const res = await assignSop(assignForm);
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
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 540 }}>
        <div className={styles.modalHeader}>
          <h3>Assign New SOP</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {errorMsg && <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}

        <form onSubmit={handleAssignSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>SOP Code *</label>
              <input
                type="text"
                placeholder="e.g. SOP-TAX-2026-005"
                value={assignForm.sopCode}
                onChange={e => setAssignForm(prev => ({ ...prev, sopCode: e.target.value }))}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Entity *</label>
              <CustomSelect
                value={assignForm.entityCode}
                options={ENTITY_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, entityCode: e.target.value }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Process Category *</label>
              <CustomSelect
                value={assignForm.processCategory}
                options={processOptions}
                onChange={e => setAssignForm(prev => ({ ...prev, processCategory: e.target.value }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Assign SOP Creator *</label>
              <CustomSelect
                value={assignForm.assignedCreatorId}
                options={CREATOR_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, assignedCreatorId: e.target.value }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Assign SOP Approver *</label>
              <CustomSelect
                value={assignForm.assignedApproverId}
                options={APPROVER_OPTIONS}
                onChange={e => setAssignForm(prev => ({ ...prev, assignedApproverId: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? 'Assigning...' : 'Assign SOP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

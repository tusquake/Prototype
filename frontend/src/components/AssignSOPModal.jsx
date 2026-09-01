import { useState } from 'react';
import CustomSelect from './CustomSelect';
import { assignSop } from '../services/api';
import styles from '../pages/Sops.module.css';

const ENTITY_OPTIONS = [
  { value: 'CK_INDIA', label: 'CK India' },
  { value: 'CK_US', label: 'CK US' },
  { value: 'CK_UK', label: 'CK UK' },
  { value: 'CK_AUSTRALIA', label: 'CK Australia' },
];

const PROCESS_OPTIONS = [
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
  const [assignForm, setAssignForm] = useState({
    sopCode: '',
    entityCode: 'CK_INDIA',
    processCategory: 'Tax Compliance',
    assignedCreatorId: 'usr-tushar-304',
    assignedApproverId: 'usr-vivek-108',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      onSuccess(`SOP Assignment "${assignForm.sopCode}" created successfully! Creator assigned to draft for category "${assignForm.processCategory}".`, res);
      onClose();
      setAssignForm({
        sopCode: '',
        entityCode: 'CK_INDIA',
        processCategory: 'Tax Compliance',
        assignedCreatorId: 'usr-tushar-304',
        assignedApproverId: 'usr-vivek-108',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create SOP assignment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: 620, overflow: 'visible' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Assign SOP Creation & Approval</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleAssignSubmit}>
          <div className={styles.modalBody} style={{ overflow: 'visible', maxHeight: 'none' }}>
            {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>SOP CODE *</label>
              <input
                type="text"
                value={assignForm.sopCode}
                onChange={e => setAssignForm(prev => ({ ...prev, sopCode: e.target.value }))}
                placeholder="e.g. SOP-TAX-IN-088"
                required
              />
            </div>

            <div className={`${styles.formRow} ${styles.fullWidth}`}>
              <div className={styles.formGroup}>
                <label>CORPORATE ENTITY *</label>
                <CustomSelect
                  value={assignForm.entityCode}
                  options={ENTITY_OPTIONS}
                  onChange={e => setAssignForm(prev => ({ ...prev, entityCode: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label>PROCESS CATEGORY *</label>
                <CustomSelect
                  value={assignForm.processCategory}
                  options={PROCESS_OPTIONS}
                  onChange={e => setAssignForm(prev => ({ ...prev, processCategory: e.target.value }))}
                />
              </div>
            </div>

            <div className={`${styles.formRow} ${styles.fullWidth}`}>
              <div className={styles.formGroup}>
                <label>ASSIGNED CREATOR *</label>
                <CustomSelect
                  value={assignForm.assignedCreatorId}
                  options={CREATOR_OPTIONS}
                  onChange={e => setAssignForm(prev => ({ ...prev, assignedCreatorId: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label>ASSIGNED APPROVER *</label>
                <CustomSelect
                  value={assignForm.assignedApproverId}
                  options={APPROVER_OPTIONS}
                  onChange={e => setAssignForm(prev => ({ ...prev, assignedApproverId: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={saving} style={{ background: '#0284c7' }}>
              {saving ? 'Creating Assignment...' : 'Assign SOP Creation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

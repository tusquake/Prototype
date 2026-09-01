import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import UserPickerModal from './UserPickerModal';
import { submitSopDraft, updateSop, createSop } from '../services/api';
import styles from '../pages/Sops.module.css';

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const INITIAL_FORM = {
  sopCode: '',
  title: '',
  description: '',
  processCategory: 'Tax Compliance',
  entityCode: 'CK_INDIA',
  frequency: 'MONTHLY',
  dueDayOffset: 15,
  isRecurring: false,
  defaultMakerIds: ['usr-tushar-304', 'usr-prayasa-410'],
  defaultCheckerIds: ['usr-vivek-108', 'usr-mainak-215'],
};

const USER_ID_MAP = {
  'Tushar Seth': 'usr-tushar-304',
  'Vivek Raj': 'usr-vivek-108',
  'Mainak Gupta': 'usr-mainak-215',
  'Prayasa Sharma': 'usr-prayasa-410',
  'Manoj Agarwal': 'usr-manoj-042',
  'Avisek Paul': 'usr-avisek-499',
};

export default function CreateSOPModal({ isOpen, editingSop, currentUser, userMap, onClose, onSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingSop) {
      let rawMakers = editingSop.defaultMakerIds || (editingSop.defaultMakerNames ? editingSop.defaultMakerNames.map(n => USER_ID_MAP[n] || n) : (editingSop.defaultMakerId ? [editingSop.defaultMakerId] : ['usr-tushar-304']));
      let rawCheckers = editingSop.defaultCheckerIds || (editingSop.defaultCheckerNames ? editingSop.defaultCheckerNames.map(n => USER_ID_MAP[n] || n) : (editingSop.defaultCheckerId ? [editingSop.defaultCheckerId] : ['usr-mainak-215']));

      const makers = Array.from(new Set(rawMakers.map(id => USER_ID_MAP[id] || id)));
      const checkers = Array.from(new Set(rawCheckers.map(id => USER_ID_MAP[id] || id)));

      setFormData({
        sopCode: editingSop.code || editingSop.sopCode || '',
        title: editingSop.name || editingSop.title || '',
        description: editingSop.description || '',
        processCategory: editingSop.process || editingSop.processCategory || 'Tax Compliance',
        entityCode: editingSop.entityCode || 'CK_INDIA',
        frequency: editingSop.frequency || 'MONTHLY',
        dueDayOffset: editingSop.dueDay || editingSop.dueDayOffset || 15,
        isRecurring: editingSop.isRecurring !== undefined ? !!editingSop.isRecurring : false,
        defaultMakerIds: makers,
        defaultCheckerIds: checkers,
      });
    } else {
      setFormData(INITIAL_FORM);
    }
  }, [editingSop, isOpen]);

  if (!isOpen) return null;

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dueDayOffset' ? parseInt(value, 10) || 1 : value,
    }));
  }

  function getNamesForIds(ids = []) {
    if (!ids.length) return 'None assigned';
    return ids.map(id => userMap[id] || id).join(', ');
  }

  function removeMakerUser(userId) {
    setFormData(prev => {
      if (prev.defaultMakerIds.length <= 1) return prev;
      return { ...prev, defaultMakerIds: prev.defaultMakerIds.filter(id => id !== userId) };
    });
  }

  function removeCheckerUser(userId) {
    setFormData(prev => {
      if (prev.defaultCheckerIds.length <= 1) return prev;
      return { ...prev, defaultCheckerIds: prev.defaultCheckerIds.filter(id => id !== userId) };
    });
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.sopCode.trim() || !formData.title.trim()) {
      setErrorMsg('SOP Code and Title are required.');
      return;
    }

    try {
      setSaving(true);
      const makerId = USER_ID_MAP[formData.defaultMakerIds[0]] || formData.defaultMakerIds[0] || 'usr-tushar-304';
      const checkerId = USER_ID_MAP[formData.defaultCheckerIds[0]] || formData.defaultCheckerIds[0] || 'usr-mainak-215';

      const payload = {
        ...formData,
        defaultMakerId: makerId,
        defaultCheckerId: checkerId,
        createdById: currentUser?.id || 'usr-tushar-304',
      };

      if (editingSop && (editingSop.status === 'PENDING_CREATION' || editingSop.status === 'REJECTED')) {
        const res = await submitSopDraft(editingSop.sopId || editingSop.id || editingSop.code, {
          ...payload,
          actorId: currentUser?.id || 'usr-tushar-304'
        });
        onSuccess(`SOP draft "${formData.title}" submitted for approval successfully! Status: PENDING_APPROVAL.`, res);
      } else if (editingSop) {
        const res = await updateSop(editingSop.sopId || editingSop.id || editingSop.code, payload);
        onSuccess(`SOP "${formData.title}" updated successfully! Version incremented.`, res);
      } else {
        const res = await createSop(payload);
        onSuccess(`SOP "${formData.title}" created successfully!`, res);
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save SOP specification');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div>
              <h3>{editingSop ? 'Draft SOP Specification' : 'Create SOP Specification'}</h3>
              <p>{editingSop ? `Drafting ${editingSop.code || editingSop.sopCode}` : 'Configure compliance schedule, assigned Maker pool, and Checker pool.'}</p>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className={styles.modalBody}>
              {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

              <div className={`${styles.formRow} ${styles.fullWidth}`}>
                <div className={styles.formGroup}>
                  <label>SOP CODE (LOCKED BY ADMIN) *</label>
                  <input
                    type="text"
                    name="sopCode"
                    value={formData.sopCode}
                    onChange={handleInputChange}
                    disabled={!!editingSop}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>PROCESS CATEGORY (LOCKED BY ADMIN) *</label>
                  <input
                    type="text"
                    value={formData.processCategory}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>SOP TITLE / NAME *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Quarterly GST Reconciliation & Filing"
                  required
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>DESCRIPTION</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide operational steps, required documents, and compliance guidelines..."
                  rows={3}
                />
              </div>

              <div className={`${styles.formRow} ${styles.fullWidth}`}>
                <div className={styles.formGroup}>
                  <label>SCHEDULE RECURRENCE MODE</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                      style={{
                        position: 'relative',
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: formData.isRecurring ? '#2563eb' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        padding: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#ffffff',
                          transform: formData.isRecurring ? 'translateX(20px)' : 'translateX(0)',
                          transition: 'transform 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: formData.isRecurring ? '#1e293b' : '#64748b' }}>
                      {formData.isRecurring ? 'Recurring Schedule (Automated Period Generation)' : 'One-Time Execution'}
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>COMPLIANCE FREQUENCY *</label>
                  <CustomSelect
                    name="frequency"
                    value={formData.frequency}
                    options={FREQ_OPTIONS}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>DUE DAY OFFSET *</label>
                  <input
                    type="number"
                    name="dueDayOffset"
                    value={formData.dueDayOffset}
                    onChange={handleInputChange}
                    min={1}
                    max={31}
                    required
                  />
                </div>
              </div>

              {/* Pool Assignments */}
              <div className={`${styles.assignmentSection} ${styles.fullWidth}`}>
                <div className={styles.assignmentTitle}>Pool Assignments</div>

                <div className={styles.assignmentColumn}>
                  <div className={styles.formGroup}>
                    <div className={styles.pickerHeader}>
                      <label>ASSIGNED MAKER POOL *</label>
                      <button
                        type="button"
                        className={styles.pickerBtn}
                        onClick={() => setShowMakerPicker(true)}
                      >
                        Select Makers ({formData.defaultMakerIds.length})
                      </button>
                    </div>

                    <div className={styles.poolBadgeList}>
                      {formData.defaultMakerIds.map(id => (
                        <div key={id} className={styles.userBadge}>
                          <span>{userMap[id] || id}</span>
                          {formData.defaultMakerIds.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeUserBtn}
                              onClick={() => removeMakerUser(id)}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.pickerHeader}>
                      <label>ASSIGNED CHECKER POOL *</label>
                      <button
                        type="button"
                        className={styles.pickerBtn}
                        onClick={() => setShowCheckerPicker(true)}
                      >
                        Select Checkers ({formData.defaultCheckerIds.length})
                      </button>
                    </div>

                    <div className={styles.poolBadgeList}>
                      {formData.defaultCheckerIds.map(id => (
                        <div key={id} className={styles.userBadge}>
                          <span>{userMap[id] || id}</span>
                          {formData.defaultCheckerIds.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeUserBtn}
                              onClick={() => removeCheckerUser(id)}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={saving}>
                {saving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Assigned Maker Pool"
        entityCode={formData.entityCode}
        targetRole="MAKER"
        selectedUserIds={formData.defaultMakerIds}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={selectedIds => {
          setFormData(prev => ({ ...prev, defaultMakerIds: selectedIds }));
          setShowMakerPicker(false);
        }}
        onSelect={selectedIds => {
          setFormData(prev => ({ ...prev, defaultMakerIds: selectedIds }));
          setShowMakerPicker(false);
        }}
      />

      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Assigned Checker Pool"
        entityCode={formData.entityCode}
        targetRole="CHECKER"
        selectedUserIds={formData.defaultCheckerIds}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={selectedIds => {
          setFormData(prev => ({ ...prev, defaultCheckerIds: selectedIds }));
          setShowCheckerPicker(false);
        }}
        onSelect={selectedIds => {
          setFormData(prev => ({ ...prev, defaultCheckerIds: selectedIds }));
          setShowCheckerPicker(false);
        }}
      />
    </>
  );
}

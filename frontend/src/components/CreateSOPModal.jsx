import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import UserPickerModal from './UserPickerModal';
import { submitSopDraft, updateSop, createSop, getUsersByPermission } from '../services/api';

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
  defaultMakerIds: [],
  defaultCheckerIds: [],
};

const USER_ID_MAP = {
  'Tushar Seth': 'usr-tushar-304',
  'Vivek Raj': 'usr-vivek-108',
  'Mainak Gupta': 'usr-mainak-215',
  'Prayasa Sharma': 'usr-prayasa-410',
  'Manoj Agarwal': 'usr-manoj-042',
  'Avisek Paul': 'usr-avisek-499',
};

const ENTITY_NAME_MAP = {
  CK_INDIA: 'CK India',
  CK_US: 'CK US',
  CK_UK: 'CK UK',
  CK_AUSTRALIA: 'CK Australia',
};

export default function CreateSOPModal({ isOpen, editingSop, lockedAssignment, currentUser, userMap, onClose, onSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isCreatorDraftMode = !!lockedAssignment && !editingSop;

  const [permittedMakers, setPermittedMakers] = useState(null);
  const [permittedCheckers, setPermittedCheckers] = useState(null);

  useEffect(() => {
    if (isOpen && formData.processCategory) {
      getUsersByPermission(formData.processCategory, 'MAKER')
        .then(res => setPermittedMakers(Array.isArray(res) ? res : []))
        .catch(() => setPermittedMakers([]));

      getUsersByPermission(formData.processCategory, 'CHECKER')
        .then(res => setPermittedCheckers(Array.isArray(res) ? res : []))
        .catch(() => setPermittedCheckers([]));
    }
  }, [isOpen, formData.processCategory]);

  useEffect(() => {
    if (lockedAssignment) {
      setFormData({
        ...INITIAL_FORM,
        sopCode: lockedAssignment.code || lockedAssignment.sopCode || '',
        processCategory: lockedAssignment.process || lockedAssignment.processCategory || 'Tax Compliance',
        entityCode: lockedAssignment.entityCode || 'CK_INDIA',
        title: '',
        description: '',
      });
    } else if (editingSop) {
      let rawMakers = editingSop.defaultMakerIds || (editingSop.defaultMakerNames ? editingSop.defaultMakerNames.map(n => USER_ID_MAP[n] || n) : (editingSop.defaultMakerId ? [editingSop.defaultMakerId] : []));
      let rawCheckers = editingSop.defaultCheckerIds || (editingSop.defaultCheckerNames ? editingSop.defaultCheckerNames.map(n => USER_ID_MAP[n] || n) : (editingSop.defaultCheckerId ? [editingSop.defaultCheckerId] : []));

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
    setErrorMsg('');
  }, [editingSop, lockedAssignment, isOpen]);

  if (!isOpen) return null;

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dueDayOffset' ? parseInt(value, 10) || 1 : value,
    }));
  }

  function removeMakerUser(userId) {
    setFormData(prev => ({
      ...prev,
      defaultMakerIds: prev.defaultMakerIds.filter(id => id !== userId),
    }));
  }

  function removeCheckerUser(userId) {
    setFormData(prev => ({
      ...prev,
      defaultCheckerIds: prev.defaultCheckerIds.filter(id => id !== userId),
    }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.sopCode.trim() || !formData.title.trim()) {
      setErrorMsg('SOP Code and Title are required.');
      return;
    }

    if (formData.defaultMakerIds.length === 0) {
      setErrorMsg('Please select at least one Maker for the Assigned Maker Pool.');
      return;
    }

    if (formData.defaultCheckerIds.length === 0) {
      setErrorMsg('Please select at least one Checker for the Assigned Checker Pool.');
      return;
    }

    try {
      setSaving(true);
      const makerId = USER_ID_MAP[formData.defaultMakerIds[0]] || formData.defaultMakerIds[0];
      const checkerId = USER_ID_MAP[formData.defaultCheckerIds[0]] || formData.defaultCheckerIds[0];

      const payload = {
        ...formData,
        defaultMakerId: makerId,
        defaultCheckerId: checkerId,
        createdById: currentUser?.id || 'usr-tushar-304',
        actorId: currentUser?.id || 'usr-tushar-304',
      };

      if (isCreatorDraftMode) {
        const sopId = lockedAssignment.id || lockedAssignment.sopId;
        const res = await submitSopDraft(sopId, payload);
        window.dispatchEvent(new Event('sop-updated'));
        onSuccess(`SOP draft "${formData.title}" submitted for approval successfully!`, res);
      } else if (editingSop && (editingSop.status === 'PENDING_CREATION' || editingSop.status === 'REJECTED')) {
        const res = await submitSopDraft(editingSop.sopId || editingSop.id || editingSop.code, payload);
        window.dispatchEvent(new Event('sop-updated'));
        onSuccess(`SOP draft "${formData.title}" submitted for approval successfully!`, res);
      } else if (editingSop) {
        const res = await updateSop(editingSop.sopId || editingSop.id || editingSop.code, payload);
        window.dispatchEvent(new Event('sop-updated'));
        onSuccess(`SOP "${formData.title}" updated successfully!`, res);
      } else {
        const res = await createSop(payload);
        window.dispatchEvent(new Event('sop-updated'));
        onSuccess(`SOP "${formData.title}" created successfully!`, res);
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save SOP specification');
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = isCreatorDraftMode
    ? 'Draft Assigned SOP'
    : editingSop
      ? 'Edit SOP Specification'
      : 'Create SOP Specification';

  const modalSubtitle = 'Configure compliance schedule, assigned Maker pool, and Checker pool.';

  const isEditOfApprovedSop = !!editingSop && editingSop.status !== 'PENDING_CREATION' && editingSop.status !== 'REJECTED';

  const submitLabel = saving
    ? 'Submitting...'
    : isEditOfApprovedSop
      ? 'Save & Resubmit for Approval'
      : isCreatorDraftMode || (editingSop && (editingSop.status === 'PENDING_CREATION' || editingSop.status === 'REJECTED'))
        ? 'Submit for Approval'
        : 'Create & Send for Approval';

  return (
    <>
      <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6">
        <div className="bg-bg-surface rounded-[16px] w-full max-w-[780px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden animate-modal-slide-in">
          <div className="p-[24px_28px] bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white flex items-start justify-between">
            <div>
              <h3 className="text-[17px] font-bold text-white tracking-[-0.2px]">{modalTitle}</h3>
              <p className="text-[12.5px] text-white/90 mt-0.5">{modalSubtitle}</p>
            </div>
            <button
              type="button"
              className="bg-white/15 border border-white/25 rounded-[8px] w-8 h-8 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-white/30"
              onClick={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="p-7 grid grid-cols-2 gap-[18px] max-h-[72vh] overflow-y-auto [scrollbar-gutter:stable]">
              {errorMsg && (
                <div className="col-span-full p-[12px_16px] rounded-[8px] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] text-[#dc2626] text-[13px] font-medium flex items-center gap-2">
                  {errorMsg}
                </div>
              )}

              {isEditOfApprovedSop && (
                <div className="col-span-full bg-[rgba(37,99,235,0.07)] border border-[rgba(37,99,235,0.25)] rounded-[8px] p-[10px_14px] text-[13px] text-[#1e40af] flex items-start gap-2 mb-1">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    <strong>Re-approval required:</strong> Saving changes will reset status to <strong>Pending Approval</strong> and notify the assigned approver (<strong>{editingSop?.assignedApproverName || 'Approver'}</strong>). Version will remain unchanged.
                  </span>
                </div>
              )}

              {/* Clean Form Row with non-editable fields when in creator draft mode */}
              <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 w-full">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">SOP CODE *</label>
                  <input
                    type="text"
                    name="sopCode"
                    value={formData.sopCode}
                    onChange={handleInputChange}
                    disabled={isCreatorDraftMode || !!editingSop}
                    className={`w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] text-[13.5px] outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)] ${isCreatorDraftMode || !!editingSop
                        ? 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1] cursor-not-allowed font-semibold'
                        : 'bg-bg-surface text-text-primary'
                      }`}
                    required
                  />
                </div>

                {isCreatorDraftMode && (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">CORPORATE ENTITY *</label>
                    <input
                      type="text"
                      value={ENTITY_NAME_MAP[formData.entityCode] || formData.entityCode}
                      disabled
                      className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-[#f1f5f9] text-[#475569] text-[13.5px] font-semibold cursor-not-allowed outline-none"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">PROCESS CATEGORY *</label>
                  <input
                    type="text"
                    value={formData.processCategory}
                    disabled
                    className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-[#f1f5f9] text-[#475569] text-[13.5px] font-semibold cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="col-span-full flex flex-col gap-1.5 min-w-0">
                <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">SOP TITLE / NAME *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Quarterly GST Reconciliation & Filing"
                  required
                  autoFocus={isCreatorDraftMode}
                  className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[13.5px] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </div>

              <div className="col-span-full flex flex-col gap-1.5 min-w-0">
                <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">DESCRIPTION</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide operational steps, required documents, and compliance guidelines..."
                  rows={3}
                  className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[13.5px] text-text-primary outline-none transition-all duration-150 resize-y min-h-[85px] leading-normal focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </div>

              <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 w-full">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">SCHEDULE RECURRENCE MODE</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                      className={`relative w-[44px] min-w-[44px] h-[24px] rounded-[12px] border-none cursor-pointer transition-colors duration-200 p-[2px] shrink-0 box-border inline-block ${formData.isRecurring ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'
                        }`}
                    >
                      <div
                        className={`w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ${formData.isRecurring ? 'translate-x-[20px]' : 'translate-x-0'
                          }`}
                      />
                    </button>
                    <span className={`text-[13.5px] font-semibold ${formData.isRecurring ? 'text-[#1e293b]' : 'text-[#64748b]'}`}>
                      {formData.isRecurring ? 'Recurring Schedule (Automated Period Generation)' : 'One-Time Execution'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">COMPLIANCE FREQUENCY *</label>
                  {formData.isRecurring ? (
                    <CustomSelect
                      name="frequency"
                      value={formData.frequency}
                      options={FREQ_OPTIONS}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <input
                      type="text"
                      value="N/A (One-Time Task)"
                      disabled
                      className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-[#f1f5f9] text-[#64748b] text-[13px] font-semibold cursor-not-allowed outline-none"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">DUE DAY OFFSET *</label>
                  <input
                    type="number"
                    name="dueDayOffset"
                    value={formData.dueDayOffset}
                    onChange={handleInputChange}
                    min={1}
                    max={31}
                    required
                    className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[13.5px] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                  />
                </div>
              </div>

              {/* Pool Assignments */}
              <div className="col-span-full bg-[#f8fafc] border border-[#e2e8f0] rounded-[12px] p-5 mt-1.5 box-border">
                <div className="text-[13px] font-bold text-[#1e293b] uppercase tracking-[0.5px] mb-3.5">Pool Assignments</div>

                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">ASSIGNED MAKER POOL *</label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 p-[5px_12px] rounded-[6px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#dbeafe] hover:border-[#93c5fd] hover:text-[#1e40af]"
                        onClick={() => setShowMakerPicker(true)}
                      >
                        Select Makers ({formData.defaultMakerIds.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 bg-bg-surface border border-[#cbd5e1] rounded-[8px] p-[8px_12px] min-h-[42px] items-center box-border">
                      {formData.defaultMakerIds.length === 0 ? (
                        <span className="text-[13px] text-[#94a3b8] italic">No Makers selected — click "Select Makers" to assign</span>
                      ) : (
                        formData.defaultMakerIds.map(id => (
                          <div key={id} className="inline-flex items-center gap-1.5 p-[4px_8px_4px_10px] rounded-[16px] bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] text-[12px] font-semibold">
                            <span>{userMap[id] || id}</span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full border-none bg-[rgba(100,116,139,0.15)] text-[#64748b] cursor-pointer ml-0.5 p-0 transition-all duration-150 hover:bg-[#ef4444] hover:text-white"
                              onClick={() => removeMakerUser(id)}
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">ASSIGNED CHECKER POOL *</label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 p-[5px_12px] rounded-[6px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#dbeafe] hover:border-[#93c5fd] hover:text-[#1e40af]"
                        onClick={() => setShowCheckerPicker(true)}
                      >
                        Select Checkers ({formData.defaultCheckerIds.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 bg-bg-surface border border-[#cbd5e1] rounded-[8px] p-[8px_12px] min-h-[42px] items-center box-border">
                      {formData.defaultCheckerIds.length === 0 ? (
                        <span className="text-[13px] text-[#94a3b8] italic">No Checkers selected — click "Select Checkers" to assign</span>
                      ) : (
                        formData.defaultCheckerIds.map(id => (
                          <div key={id} className="inline-flex items-center gap-1.5 p-[4px_8px_4px_10px] rounded-[16px] bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] text-[12px] font-semibold">
                            <span>{userMap[id] || id}</span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full border-none bg-[rgba(100,116,139,0.15)] text-[#64748b] cursor-pointer ml-0.5 p-0 transition-all duration-150 hover:bg-[#ef4444] hover:text-white"
                              onClick={() => removeCheckerUser(id)}
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-[18px_28px] border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-5 py-[9px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[#475569] text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-[22px] py-[9px] rounded-[8px] border-none bg-[#2563eb] text-white text-[13px] font-semibold cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all duration-150 hover:bg-[#1d4ed8] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {submitLabel}
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
        permittedUsers={permittedMakers}
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
        permittedUsers={permittedCheckers}
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

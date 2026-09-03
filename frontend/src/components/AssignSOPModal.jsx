import { useState, useEffect, useCallback } from 'react';
import UserPickerModal from './UserPickerModal';
import { assignSop, getProcessCategories, getUsersByPermission } from '../services/api';


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
    assignedApproverIds: [],
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
    setAssignForm(prev => ({ ...prev, assignedCreatorIds: [], assignedApproverIds: [] }));
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

  function removeApprover(userId) {
    setAssignForm(prev => ({
      ...prev,
      assignedApproverIds: prev.assignedApproverIds.filter(id => id !== userId),
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
    if (assignForm.assignedApproverIds.length === 0) {
      setErrorMsg('Please select at least one SOP Approver.');
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
        assignedApproverIds: assignForm.assignedApproverIds,
        assignedApproverId: assignForm.assignedApproverIds[0], // primary (backward compat)
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
    <>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
            <div className="flex flex-col">
              <h3 className="m-0 text-lg font-bold text-slate-900">Assign New SOP</h3>
              <p className="mt-0.5 text-[12.5px] text-slate-500">
                Creator & approver lists show only users with required permissions for the selected category.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
              onClick={onClose}
              title="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">
            {errorMsg && (
              <div className="rounded-lg border border-red-300 bg-red-100 p-2.5 text-xs font-medium text-red-600">
                {errorMsg}
              </div>
            )}

            <form id="assign-sop-form" onSubmit={handleAssignSubmit} className="flex flex-col gap-4">

              {/* SOP Code */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">SOP Code *</span>
                <input
                  type="text"
                  placeholder="e.g. SOP-TAX-2026-005"
                  value={assignForm.sopCode}
                  onChange={e => setAssignForm(prev => ({ ...prev, sopCode: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Entity */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Entity *</span>
                <select
                  value={assignForm.entityCode}
                  onChange={e => setAssignForm(prev => ({ ...prev, entityCode: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Process Category */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Process Category *</span>
                <select
                  value={assignForm.processCategory}
                  onChange={e => setAssignForm(prev => ({ ...prev, processCategory: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  {processOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* SOP Creators — UserPicker Modal Trigger + Badges */}
              <div className="flex flex-col gap-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assign SOP Creators *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreatorPicker(true)}
                    disabled={loadingUsers || permittedCreators.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.25 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Creators ({assignForm.assignedCreatorIds.length})
                  </button>
                </div>

                {noCreatorsMsg ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    {noCreatorsMsg}
                  </div>
                ) : (
                  <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2">
                    {assignForm.assignedCreatorIds.length === 0 ? (
                      <span className="text-xs italic text-slate-400">No creators selected — click "Select Creators" above</span>
                    ) : (
                      assignForm.assignedCreatorIds.map(id => {
                        const u = permittedCreators.find(x => x.id === id) || { id, name: id };
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            <span>{u.name || id}</span>
                            <button
                              type="button"
                              onClick={() => removeCreator(id)}
                              title="Remove creator"
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-500/20 text-[12px] leading-none text-slate-600 hover:bg-slate-500/30"
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

              {/* SOP Approvers — UserPicker Modal Trigger + Badges */}
              <div className="flex flex-col gap-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assign SOP Approvers *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowApproverPicker(true)}
                    disabled={loadingUsers || permittedApprovers.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.25 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Approvers ({assignForm.assignedApproverIds.length})
                  </button>
                </div>

                {noApproversMsg ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    {noApproversMsg}
                  </div>
                ) : (
                  <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2">
                    {assignForm.assignedApproverIds.length === 0 ? (
                      <span className="text-xs italic text-slate-400">No approvers selected — click "Select Approvers" above</span>
                    ) : (
                      assignForm.assignedApproverIds.map(id => {
                        const u = permittedApprovers.find(x => x.id === id) || { id, name: id };
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            <span>{u.name || id}</span>
                            <button
                              type="button"
                              onClick={() => removeApprover(id)}
                              title="Remove approver"
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-500/20 text-[12px] leading-none text-slate-600 hover:bg-slate-500/30"
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
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="assign-sop-form"
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || loadingUsers}
            >
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

      {/* UserPickerModal for SOP Approvers */}
      <UserPickerModal
        isOpen={showApproverPicker}
        title="Select Assigned SOP Approvers"
        selectedUserIds={assignForm.assignedApproverIds}
        permittedUsers={permittedApprovers}
        onClose={() => setShowApproverPicker(false)}
        onConfirm={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedApproverIds: selectedIds }));
          setShowApproverPicker(false);
        }}
        onSelect={selectedIds => {
          setAssignForm(prev => ({ ...prev, assignedApproverIds: selectedIds }));
          setShowApproverPicker(false);
        }}
      />
    </>
  );
}

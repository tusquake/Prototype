import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';

const FREQ_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', DAILY: 'Daily', WEEKLY: 'Weekly' };

export default function SopDetailModal({
  isOpen,
  sop,
  isAdmin,
  currentUser,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  if (!isOpen || !sop) return null;

  const isPendingCreation = sop.status === 'PENDING_CREATION';
  const isPendingApproval = sop.status === 'PENDING_APPROVAL';
  const isActive = sop.status === 'ACTIVE' || sop.status === 'APPROVED';
  const isRejected = sop.status === 'REJECTED';

  const makersList = isPendingCreation ? [] : (sop.makers?.length ? sop.makers : (sop.maker ? [sop.maker] : []));
  const checkersList = isPendingCreation ? [] : (sop.checkers?.length ? sop.checkers : (sop.checker ? [sop.checker] : []));

  const milestoneCount = 1 + (isPendingCreation ? 0 : 1) + (isActive || isRejected ? 1 : 0);
  const dbLength = sop.history?.length || 0;
  const historyLength = Math.max(dbLength, milestoneCount);

  const creatorName = (Array.isArray(sop.assignedCreatorNames) && sop.assignedCreatorNames.length > 0)
    ? sop.assignedCreatorNames.join(', ')
    : (sop.assignedCreatorName || sop.assignedCreatorId || 'Creator');
  const approverName = (Array.isArray(sop.assignedApproverNames) && sop.assignedApproverNames.length > 0)
    ? sop.assignedApproverNames.join(', ')
    : (sop.assignedApproverName || sop.assignedApproverId || 'Approver');
  const adminName = sop.createdByName || 'Manoj Agarwal';

  return (
    <>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
            <div className="flex flex-col">
              <h3 className="mb-1.5 text-lg font-bold text-slate-900">{sop.name || sop.title}</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#1a2b6b]/[0.08] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#1a2b6b]">
                  {sop.code || sop.sopCode}
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  v{sop.version || 1}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-blue-600/25 bg-blue-600/[0.08] px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600/[0.15]"
                onClick={() => setShowActivityLogModal(true)}
                title="Open SOP Activity Log & Audit Trail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Activity Log</span>
                <span className="rounded-full bg-blue-600 px-1.75 py-0.5 text-[11px] font-bold text-white">
                  {historyLength}
                </span>
              </button>

              <button
                className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
                onClick={onClose}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">
            {/* Visual SOP Governance Lifecycle Progress Flow */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 px-4.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                SOP Governance Lifecycle Flow
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {/* Step 1: Admin Assignment */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">Admin Assignment</span>
                    <span className="text-[11px] text-slate-500">Assigned by {adminName}</span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${!isPendingCreation ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 2: Creator Submission */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isPendingCreation
                      ? 'bg-amber-600 text-white ring-4 ring-amber-600/20'
                      : 'bg-blue-600 text-white'
                    }`}>
                    2
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">Creator Draft</span>
                    <span className="text-[11px] text-slate-500">
                      {isPendingCreation ? `Pending ${creatorName} Draft` : `Submitted by ${creatorName}`}
                    </span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${isActive || isRejected ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 3: Approver Outcome */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-green-600 text-white' :
                      isRejected ? 'bg-red-600 text-white' :
                        isPendingApproval ? 'bg-amber-600 text-white ring-4 ring-amber-600/20' :
                          'bg-slate-300 text-slate-600'
                    }`}>
                    {isActive ? '✓' : isRejected ? '↺' : '3'}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {isActive ? 'Active & Scheduled' : isRejected ? 'Rejected & Returned' : 'Approver Outcome'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isActive ? `Approved by ${approverName}` : isRejected ? `Rejected by ${approverName}` : `Pending ${approverName} Review`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Corporate Entity</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{sop.entity || sop.entityName || sop.entityCode}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Process Category</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{sop.process || sop.processCategory}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Frequency</span>
                <span className="text-[13.5px] font-semibold text-slate-800">
                  {isPendingCreation ? (
                    <span className="italic text-slate-400">Pending Creation</span>
                  ) : (
                    sop.isRecurring ? (FREQ_LABEL[sop.frequency] || sop.frequency) : 'N/A (One-Time Task)'
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Due Day Offset</span>
                <span className="text-[13.5px] font-semibold text-slate-800">
                  {isPendingCreation ? (
                    <span className="italic text-slate-400">Pending Creation</span>
                  ) : (
                    `Day ${sop.dueDay || sop.dueDayOffset}`
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scheduling Mode</span>
                <span className="text-[13.5px] font-semibold text-slate-800">
                  {isPendingCreation ? (
                    <span className="italic text-slate-400">Pending Creation</span>
                  ) : sop.isRecurring ? (
                    <span className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
                      Recurring Schedule
                    </span>
                  ) : (
                    <span className="rounded px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-700">
                      One-Time Task
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Governance Status</span>
                <span className="text-[13.5px] font-semibold text-slate-800">
                  {sop.status === 'PENDING_CREATION' && <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-orange-100 text-orange-700">PENDING CREATION</span>}
                  {sop.status === 'PENDING_APPROVAL' && <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-700">PENDING APPROVAL</span>}
                  {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-green-100 text-green-700">ACTIVE (APPROVED)</span>}
                  {sop.status === 'REJECTED' && <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-700">REJECTED</span>}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Creator</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{creatorName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Approver</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{approverName}</span>
              </div>
            </div>

            {sop.rejectionReason && (
              <div className="mb-3 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Rejection Comments</span>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 leading-relaxed">
                  {sop.rejectionReason}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 px-4 text-sm text-slate-700 leading-relaxed">
                {sop.description && sop.description.trim() ? sop.description : 'No description provided.'}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Maker Pool</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {makersList.length === 0 ? (
                  <span className="text-xs italic text-slate-400">Not configured yet (Pending Creation)</span>
                ) : (
                  makersList.map((m, idx) => (
                    <span key={idx} className="rounded-md border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Checker Pool</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {checkersList.length === 0 ? (
                  <span className="text-xs italic text-slate-400">Not configured yet (Pending Creation)</span>
                ) : (
                  checkersList.map((c, idx) => (
                    <span key={idx} className="rounded-md border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {c}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>

            {sop.status === 'PENDING_APPROVAL' && (
              (sop.assignedApproverId === currentUser?.id || (Array.isArray(sop.assignedApproverIds) && sop.assignedApproverIds.includes(currentUser?.id)) || (currentUser?.role === 'ADMIN' && sop.assignedCreatorId !== currentUser?.id && !(Array.isArray(sop.assignedCreatorIds) && sop.assignedCreatorIds.includes(currentUser?.id)))) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-green-700"
                    onClick={() => {
                      onClose();
                      if (onApprove) onApprove(sop);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Approve &amp; Activate SOP
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-md bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-rose-800"
                    onClick={() => {
                      onClose();
                      if (onReject) onReject(sop);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Reject SOP
                  </button>
                </div>
              )
            )}

            {(isAdmin || currentUser?.role === 'ADMIN' || sop.assignedCreatorId === currentUser?.id || (Array.isArray(sop.assignedCreatorIds) && sop.assignedCreatorIds.includes(currentUser?.id))) && (
              <div className="flex items-center gap-2.5">
                {isAdmin && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-red-600 hover:bg-red-600"
                    onClick={() => {
                      onClose();
                      onDelete(sop);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete SOP
                  </button>
                )}

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700"
                  onClick={() => {
                    onClose();
                    onEdit(sop);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit & Re-submit SOP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SopActivityLogModal
        isOpen={showActivityLogModal}
        sop={sop}
        onClose={() => setShowActivityLogModal(false)}
      />
    </>
  );
}

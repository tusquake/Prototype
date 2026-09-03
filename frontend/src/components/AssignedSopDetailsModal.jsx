import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';


export default function AssignedSopDetailsModal({ isOpen, sop, onClose, onDelete }) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  if (!isOpen || !sop) return null;

  const isPendingCreation = sop.status === 'PENDING_CREATION';
  const isPendingApproval = sop.status === 'PENDING_APPROVAL';
  const isActive = sop.status === 'ACTIVE' || sop.status === 'APPROVED';
  const isRejected = sop.status === 'REJECTED';

  const milestoneCount = 1 + (isPendingCreation ? 0 : 1) + (isActive || isRejected ? 1 : 0);
  const dbLength = sop.history?.length || 0;
  const historyLength = Math.max(dbLength, milestoneCount);

  const creatorName = sop.assignedCreatorName || sop.assignedCreatorId || 'Creator';
  const approverName = sop.assignedApproverName || sop.assignedApproverId || 'Approver';
  const adminName = sop.createdByName || 'Manoj Agarwal';

  return (
    <>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
            <div className="flex flex-col">
              <h3 className="mb-1.5 text-lg font-bold text-slate-900">SOP Creation Assignment</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#1a2b6b]/[0.08] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#1a2b6b]">
                  {sop.code || sop.sopCode}
                </span>
                {isPendingCreation && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-bold text-orange-700 bg-orange-100">
                    PENDING CREATION
                  </span>
                )}
                {isPendingApproval && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-100">
                    PENDING APPROVAL
                  </span>
                )}
                {isActive && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-bold text-green-700 bg-green-100">
                    ACTIVE
                  </span>
                )}
                {isRejected && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-bold text-red-700 bg-red-100">
                    REJECTED
                  </span>
                )}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Corporate Entity</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{sop.entity || sop.entityName || sop.entityCode}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Locked Process Category</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{sop.process || sop.processCategory}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Creator(s) (Drafting)</span>
                <span className="text-[13.5px] font-semibold text-slate-900">
                  {(Array.isArray(sop.assignedCreatorNames) && sop.assignedCreatorNames.length > 0) ? sop.assignedCreatorNames.join(', ') : (sop.assignedCreatorName || sop.assignedCreatorId || 'N/A')}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Approver(s) (Reviewing)</span>
                <span className="text-[13.5px] font-semibold text-slate-900">
                  {(Array.isArray(sop.assignedApproverNames) && sop.assignedApproverNames.length > 0) ? sop.assignedApproverNames.join(', ') : (sop.assignedApproverName || sop.assignedApproverId || 'N/A')}
                </span>
              </div>
            </div>

            {sop.rejectionReason && (
              <div className="mt-3.5 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Rejection / Revision Feedback</span>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 leading-relaxed">
                  {sop.rejectionReason}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>

            {onDelete && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-red-600 hover:bg-red-600"
                onClick={() => {
                  onClose();
                  onDelete(sop);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Assignment
              </button>
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

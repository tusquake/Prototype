import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmationModal from './ConfirmationModal';
import TaskActivityLogModal from './TaskActivityLogModal';
import Toast from './Toast';

export default function TaskActionModal({
  isOpen,
  task,
  currentUser,
  onClose,
  onSubmitTask,
  onApproveTask,
  onRejectTask,
}) {
  const [comment, setComment] = useState('');
  const [toastError, setToastError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // 'SUBMIT' | 'APPROVE' | 'REJECT'
  const [rejectionMode, setRejectionMode] = useState('resubmit'); // 'resubmit' | 'permanent'
  const [showHistory, setShowHistory] = useState(true);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setComment('');
      setToastError('');
      setPendingConfirm(null);
      setRejectionMode('resubmit');
      setShowHistory(true);
      setShowActivityLogModal(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const currentUserId = currentUser?.id || currentUser?.userId || '';
  const rawName = currentUser?.name || '';
  const cleanName = rawName.split(' (')[0].trim().toLowerCase();
  const userRole = currentUser?.role || 'ADMIN';
  const isAdmin = userRole === 'ADMIN';

  function isUserMatch(personName, personIdList) {
    if (currentUserId && Array.isArray(personIdList) && personIdList.includes(currentUserId)) return true;
    if (!personName) return false;
    if (!cleanName) return false;
    const cleanPerson = personName.toLowerCase().trim();
    return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
  }

  const isAssignedMaker = isUserMatch(task.maker, task.assignedMakerIds) ||
    isUserMatch(task.assignedMakers?.join(', '), task.assignedMakerIds) ||
    (Array.isArray(task.assignedMakerIds) && task.assignedMakerIds.includes(currentUserId)) ||
    isAdmin;

  const isAssignedChecker = isUserMatch(task.checker, task.assignedCheckerIds) ||
    isUserMatch(task.assignedCheckers?.join(', '), task.assignedCheckerIds) ||
    (Array.isArray(task.assignedCheckerIds) && task.assignedCheckerIds.includes(currentUserId)) ||
    isAdmin;

  const isLockedByOtherMaker = task.lockedMaker && !isUserMatch(task.lockedMaker) && !isAdmin;
  const isActionedByOtherChecker = task.lockedChecker && !isUserMatch(task.lockedChecker) && !isAdmin;

  // Separation of duties rule: If current non-admin user is the Maker who submitted this task, they cannot approve/reject it.
  const isSelfMakerSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && !isAdmin;

  const canSubmit = (task.status === 'OPEN' || task.status === 'REJECTED') && isAssignedMaker && !isLockedByOtherMaker;
  const canApproveOrReject = task.status === 'PENDING_REVIEW' && isAssignedChecker && !isActionedByOtherChecker && !isSelfMakerSubmission;
  const isReadOnly = !canSubmit && !canApproveOrReject;

  const isSubmittedOrDone = task.status === 'PENDING_REVIEW' || task.status === 'APPROVED' || task.status === 'REJECTED' || task.status === 'PERMANENTLY_REJECTED';

  const rawHistory = (task.history && task.history.length > 0) ? task.history : [];
  const hasCreate = rawHistory.some(h => (h.action || '').toUpperCase().includes('CREATE'));

  const effectiveHistory = hasCreate
    ? rawHistory
    : [
      {
        eventId: 0,
        action: 'CREATE_TASK',
        actorName: 'System Scheduler',
        fromStatus: null,
        toStatus: 'OPEN',
        comment: 'Compliance task cycle created automatically',
        timestamp: task.createdAt || new Date().toISOString(),
      },
      ...rawHistory,
    ];

  function triggerConfirm(actionType) {
    setToastError('');
    if (actionType === 'REJECT' && !comment.trim()) {
      setToastError('Please provide a mandatory reason for rejection.');
      return;
    }
    setPendingConfirm(actionType);
  }

  async function handleAction(actionType) {
    setToastError('');
    try {
      setSubmitting(true);
      const targetId = task.taskId || task.id || task.recordNo;
      const targetActor = currentUser?.id || currentUser?.userId || currentUser?.name || 'usr-tushar-304';

      if (actionType === 'SUBMIT') {
        await onSubmitTask(targetId, targetActor, comment);
      } else if (actionType === 'APPROVE') {
        await onApproveTask(targetId, targetActor, comment);
      } else if (actionType === 'REJECT') {
        if (!comment.trim()) {
          setToastError('Please provide a mandatory reason for rejection.');
          setSubmitting(false);
          setPendingConfirm(null);
          return;
        }
        const isPermanent = rejectionMode === 'permanent';
        await onRejectTask(targetId, targetActor, comment, isPermanent);
      }
      onClose();
    } catch (err) {
      setToastError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
      setPendingConfirm(null);
    }
  }

  const confirmProps = pendingConfirm === 'SUBMIT' ? {
    title: 'Confirm Task Submission?',
    message: 'Are you sure you want to submit this compliance task for review?',
    confirmText: 'Yes, Submit Task',
    confirmVariant: 'primary',
  } : pendingConfirm === 'APPROVE' ? {
    title: 'Confirm Task Approval?',
    message: 'Are you sure you want to approve this compliance task?',
    confirmText: 'Yes, Approve Task',
    confirmVariant: 'success',
  } : pendingConfirm === 'REJECT' ? {
    title: 'Reject Compliance Task',
    message: 'Please select how you wish to process this rejection:',
    confirmText: rejectionMode === 'permanent' ? 'Permanently Reject' : 'Reject & Return to Maker',
    confirmVariant: 'danger',
  } : null;

  return (
    <>
      <Toast message={toastError} type="error" duration={4500} onClose={() => setToastError('')} />

      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#091124]/65 p-6 backdrop-blur-md" onClick={onClose}>
        <div
          className="flex max-h-[88vh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[modalSlideIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Compliance Task Details</h3>
                <p className="mt-0.25 text-xs text-white/85">{task.record || task.recordNo} • {task.entity || task.entityName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* History / Activity Log Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/18 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/30 hover:shadow-md"
                onClick={() => setShowActivityLogModal(true)}
                title="Open Task Activity Log & Audit Trail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Activity Log</span>
                <span className="rounded-full bg-white px-1.5 py-0.25 text-[11px] font-bold text-blue-600">
                  {effectiveHistory.length}
                </span>
              </button>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white transition-all hover:bg-white/30"
                onClick={onClose}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex max-h-[68vh] flex-col gap-5 overflow-y-auto p-6">
            {/* Visual Task Lifecycle Progress Flow Diagram */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 px-4.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Status Lifecycle Flow
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {/* Step 1: Created / Open */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">Task Created</span>
                    <span className="text-[11px] text-slate-500">Open for Maker</span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${task.status !== 'OPEN' ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 2: Maker Submission */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${task.status !== 'OPEN'
                    ? (task.status === 'PENDING_REVIEW'
                      ? 'bg-amber-600 text-white ring-4 ring-amber-600/20'
                      : 'bg-blue-600 text-white')
                    : 'bg-slate-300 text-slate-600'
                    }`}>
                    2
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {task.lockedMaker ? `Submitted by ${task.lockedMaker}` : 'Maker Submission'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {task.status === 'OPEN' ? 'Awaiting Maker' : task.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Submitted'}
                    </span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${['APPROVED', 'REJECTED', 'PERMANENTLY_REJECTED'].includes(task.status) ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 3: Checker Outcome */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${task.status === 'APPROVED' ? 'bg-green-600 text-white' :
                    task.status === 'REJECTED' ? 'bg-red-600 text-white' :
                      task.status === 'PERMANENTLY_REJECTED' ? 'bg-red-900 text-white' :
                        'bg-slate-300 text-slate-600'
                    }`}>
                    {task.status === 'APPROVED' ? '✓' : task.status === 'REJECTED' ? '↺' : task.status === 'PERMANENTLY_REJECTED' ? '✕' : '3'}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {task.status === 'APPROVED' ? `Approved by ${task.lockedChecker || 'Checker'}` :
                        task.status === 'REJECTED' ? `Returned by ${task.lockedChecker || 'Checker'}` :
                          task.status === 'PERMANENTLY_REJECTED' ? `Permanently Rejected by ${task.lockedChecker || 'Checker'}` :
                            'Checker Outcome'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {task.status === 'APPROVED' ? 'Lifecycle Complete' :
                        task.status === 'REJECTED' ? 'Resubmit Allowed' :
                          task.status === 'PERMANENTLY_REJECTED' ? 'Task Closed' :
                            'Pending Review'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Metadata Cards */}
            <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">SOP Procedure</span>
                <span className="text-[13.5px] font-bold text-slate-900">{task.sop || task.sopTitle}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</span>
                <div>
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Entity &amp; Recurrence</span>
                <span className="text-xs text-slate-700">{task.entity || task.entityName} ({task.period || task.periodKey})</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due Date</span>
                <span className="text-xs text-slate-700">{task.dueDate}</span>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assigned Maker Pool</span>
                <span className="text-xs text-slate-700">
                  {task.assignedMakers?.length ? task.assignedMakers.join(', ') : task.maker}
                  {task.lockedMaker && <strong className="ml-2 text-blue-600">(Locked by {task.lockedMaker})</strong>}
                </span>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assigned Checker Pool</span>
                <span className="text-xs text-slate-700">
                  {task.assignedCheckers?.length ? task.assignedCheckers.join(', ') : task.checker}
                  {task.lockedChecker && <strong className="ml-2 text-emerald-600">(Actioned by {task.lockedChecker})</strong>}
                </span>
              </div>
            </div>

            {/* Execution Comments Section */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Execution Notes &amp; Audit Comments
              </label>
              <textarea
                className="min-h-[90px] w-full resize-y rounded-xl border border-slate-300 bg-white p-3 px-3.5 text-[13.5px] text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-400"
                rows="3"
                placeholder={
                  isReadOnly
                    ? (isSelfMakerSubmission
                      ? 'Read-only: You submitted this task as Maker (Segregation of Duties)'
                      : 'Read-only viewer mode...')
                    : canApproveOrReject
                      ? 'Enter approval notes or mandatory rejection reason...'
                      : 'Enter task execution summary, tax deposit reference, or upload comments...'
                }
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>

            <div className="flex items-center gap-2.5">
              {canSubmit && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.75 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => triggerConfirm('SUBMIT')}
                  disabled={submitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>{submitting ? 'Submitting...' : task.status === 'REJECTED' ? 'Resubmit Task' : 'Submit for Review'}</span>
                </button>
              )}

              {canApproveOrReject && (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.75 rounded-lg border border-red-600/30 bg-white px-5 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-600/8 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => triggerConfirm('REJECT')}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Reject Task</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.75 rounded-lg bg-green-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => triggerConfirm('APPROVE')}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Approve Task</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Dedicated Activity Log Modal */}
      <TaskActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
        task={{
          ...task,
          history: effectiveHistory,
        }}
      />

      {/* Confirmation Dialog Popup */}
      {confirmProps && (
        <ConfirmationModal
          isOpen={!!pendingConfirm}
          title={confirmProps.title}
          message={confirmProps.message}
          confirmText={confirmProps.confirmText}
          confirmVariant={confirmProps.confirmVariant}
          submitting={submitting}
          onConfirm={() => handleAction(pendingConfirm)}
          onClose={() => setPendingConfirm(null)}
        >
          {pendingConfirm === 'REJECT' && (
            <div className="w-full my-[14px] mb-[20px] text-left bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded-[10px]">
              <span className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em] mb-2.5">
                Select Action Mode:
              </span>
              <div className="flex flex-col gap-2.5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-all duration-150 ${rejectionMode === 'resubmit'
                      ? 'bg-[#eff6ff] border-[#2563eb] text-[#1e40af] shadow-sm'
                      : 'bg-bg-surface border-[#cbd5e1] text-[#334155] hover:border-[#94a3b8]'
                    }`}
                >
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="resubmit"
                    checked={rejectionMode === 'resubmit'}
                    onChange={() => setRejectionMode('resubmit')}
                    className="mt-1 h-4 w-4 text-[#2563eb] border-[#cbd5e1] focus:ring-[#2563eb] cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <strong className="text-[13px] font-semibold leading-tight">
                      Return to Maker for Re-submission
                    </strong>
                    <p className="text-[12px] text-text-muted mt-0.5 leading-normal">
                      Sends task back to Maker pool so evidence/notes can be corrected and submitted again
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-all duration-150 ${rejectionMode === 'permanent'
                      ? 'bg-[#fff1f2] border-[#dc2626] text-[#9f1239] shadow-sm'
                      : 'bg-bg-surface border-[#cbd5e1] text-[#334155] hover:border-[#94a3b8]'
                    }`}
                >
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="permanent"
                    checked={rejectionMode === 'permanent'}
                    onChange={() => setRejectionMode('permanent')}
                    className="mt-1 h-4 w-4 text-[#dc2626] border-[#cbd5e1] focus:ring-[#dc2626] cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <strong className="text-[13px] font-semibold leading-tight text-[#dc2626]">
                      Permanently Reject Task
                    </strong>
                    <p className="text-[12px] text-text-muted mt-0.5 leading-normal">
                      Closes task lifecycle permanently - no further submissions or changes allowed
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </ConfirmationModal>
      )}
    </>
  );
}

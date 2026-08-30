import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmationModal from './ConfirmationModal';
import TaskActivityLogModal from './TaskActivityLogModal';
import Toast from './Toast';
import styles from './TaskActionModal.module.css';

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

  const rawName = currentUser?.name || '';
  const cleanName = rawName.split(' (')[0].trim().toLowerCase();
  const userRole = currentUser?.role || 'ADMIN';
  const isViewer = userRole === 'VIEWER';
  const isAdmin = userRole === 'ADMIN';

  function isUserMatch(personName) {
    if (!personName) return false;
    const cleanPerson = personName.toLowerCase().trim();
    return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
  }

  const isAssignedMaker = isUserMatch(task.maker) || isUserMatch(task.assignedMakers?.join(', ')) || isAdmin;
  const isAssignedChecker = isUserMatch(task.checker) || isUserMatch(task.assignedCheckers?.join(', ')) || isAdmin;

  const isLockedByOtherMaker = task.lockedMaker && !isUserMatch(task.lockedMaker) && !isAdmin;
  const isActionedByOtherChecker = task.lockedChecker && !isUserMatch(task.lockedChecker) && !isAdmin;

  // Separation of duties rule: If current non-admin user is the Maker who submitted this task, they cannot approve/reject it.
  const isSelfMakerSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && !isAdmin;

  const canSubmit = (task.status === 'OPEN' || task.status === 'REJECTED') && isAssignedMaker && !isLockedByOtherMaker && !isViewer;
  const canApproveOrReject = task.status === 'PENDING_REVIEW' && isAssignedChecker && !isActionedByOtherChecker && !isSelfMakerSubmission && !isViewer;

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

      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <h3>Compliance Task Details</h3>
                <p>{task.record || task.recordNo} • {task.entity || task.entityName}</p>
              </div>
            </div>

            <div className={styles.headerRightGroup}>
              {/* History / Activity Log Button */}
              <button
                type="button"
                className={styles.historyHeaderBtn}
                onClick={() => setShowActivityLogModal(true)}
                title="Open Task Activity Log & Audit Trail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Activity Log</span>
                <span className={styles.historyBadgeCount}>{effectiveHistory.length}</span>
              </button>

              <button className={styles.closeBtn} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className={styles.modalBody}>
            {/* Visual Task Lifecycle Progress Flow Diagram */}
            <div className={styles.lifecycleTracker}>
              <div className={styles.lifecycleTitle}>Task Status Lifecycle Flow</div>
              <div className={styles.flowSteps}>
                {/* Step 1: Created / Open */}
                <div className={`${styles.flowStep} ${styles.completedStep}`}>
                  <div className={styles.stepBadge}>1</div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>Task Created</span>
                    <span className={styles.stepDetail}>Open for Maker</span>
                  </div>
                </div>

                <div className={`${styles.flowConnector} ${task.status !== 'OPEN' ? styles.activeConnector : ''}`} />

                {/* Step 2: Maker Submission */}
                <div className={`${styles.flowStep} ${task.status !== 'OPEN' ? (task.status === 'PENDING_REVIEW' ? styles.currentStep : styles.completedStep) : styles.pendingStep}`}>
                  <div className={styles.stepBadge}>2</div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>
                      {task.lockedMaker ? `Submitted by ${task.lockedMaker}` : 'Maker Submission'}
                    </span>
                    <span className={styles.stepDetail}>
                      {task.status === 'OPEN' ? 'Awaiting Maker' : task.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Submitted'}
                    </span>
                  </div>
                </div>

                <div className={`${styles.flowConnector} ${['APPROVED', 'REJECTED', 'PERMANENTLY_REJECTED'].includes(task.status) ? styles.activeConnector : ''}`} />

                {/* Step 3: Checker Outcome */}
                <div className={`${styles.flowStep} ${
                  task.status === 'APPROVED' ? styles.approvedStep :
                  task.status === 'REJECTED' ? styles.rejectedStep :
                  task.status === 'PERMANENTLY_REJECTED' ? styles.permanentRejectedStep :
                  styles.pendingStep
                }`}>
                  <div className={styles.stepBadge}>
                    {task.status === 'APPROVED' ? '✓' : task.status === 'REJECTED' ? '↺' : task.status === 'PERMANENTLY_REJECTED' ? '✕' : '3'}
                  </div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>
                      {task.status === 'APPROVED' ? `Approved by ${task.lockedChecker || 'Checker'}` :
                       task.status === 'REJECTED' ? `Returned by ${task.lockedChecker || 'Checker'}` :
                       task.status === 'PERMANENTLY_REJECTED' ? `Permanently Rejected by ${task.lockedChecker || 'Checker'}` :
                       'Checker Outcome'}
                    </span>
                    <span className={styles.stepDetail}>
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
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>SOP Procedure</span>
                <span className={styles.detailValueBold}>{task.sop || task.sopTitle}</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <div>
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Entity &amp; Recurrence</span>
                <span className={styles.detailValue}>{task.entity || task.entityName} ({task.period || task.periodKey})</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Due Date</span>
                <span className={styles.detailValue}>{task.dueDate}</span>
              </div>

              <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                <span className={styles.detailLabel}>Assigned Maker Pool</span>
                <span className={styles.detailValue}>
                  {task.assignedMakers?.length ? task.assignedMakers.join(', ') : task.maker}
                  {task.lockedMaker && <strong style={{ color: '#2563eb', marginLeft: 8 }}>(Locked by {task.lockedMaker})</strong>}
                </span>
              </div>

              <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                <span className={styles.detailLabel}>Assigned Checker Pool</span>
                <span className={styles.detailValue}>
                  {task.assignedCheckers?.length ? task.assignedCheckers.join(', ') : task.checker}
                  {task.lockedChecker && <strong style={{ color: '#059669', marginLeft: 8 }}>(Actioned by {task.lockedChecker})</strong>}
                </span>
              </div>
            </div>

            {/* Expandable / Collapsible Activity Log & Audit Trail */}
            <div className={styles.historySection}>
              <button
                type="button"
                className={styles.historyHeader}
                onClick={() => setShowHistory(prev => !prev)}
              >
                <div className={styles.historyHeaderLeft}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Activity Log &amp; Audit Trail</span>
                  <span className={styles.historyBadge}>
                    {effectiveHistory.length} event{effectiveHistory.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className={styles.historyChevron}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {showHistory && (
                <div className={styles.historyTimeline}>
                  {effectiveHistory.map((event, idx) => {
                    const act = (event.action || '').toUpperCase();
                    const actionLabel = act.includes('CREATE') ? 'Task Created' :
                                        act.includes('RESUBMIT') ? 'Resubmitted Task' :
                                        act.includes('SUBMIT') ? 'Submitted Task' :
                                        act.includes('APPROVE') ? 'Approved Task' :
                                        act.includes('PERMANENT') ? 'Permanently Rejected' :
                                        act.includes('REJECT') ? 'Rejected & Returned' : event.action;

                    const badgeCls = act.includes('APPROVE') ? styles.historyApprove :
                                     act.includes('REJECT') ? styles.historyReject :
                                     act.includes('PERMANENT') ? styles.historyPermanentReject :
                                     act.includes('RESUBMIT') ? styles.historyResubmit :
                                     act.includes('SUBMIT') ? styles.historySubmit : styles.historyCreate;

                    return (
                      <div key={event.eventId || idx} className={styles.timelineItem}>
                        <div className={`${styles.timelineIcon} ${badgeCls}`}>
                          {act.includes('APPROVE') ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : act.includes('REJECT') ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          ) : act.includes('RESUBMIT') ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                          ) : act.includes('SUBMIT') ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                          )}
                        </div>

                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTop}>
                            <span className={styles.timelineAction}>{actionLabel}</span>
                            <span className={styles.timelineActor}>by <strong>{event.actorName || 'System'}</strong></span>
                            <span className={styles.timelineTime}>
                              {event.timestamp ? new Date(event.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : 'Just now'}
                            </span>
                          </div>

                          {event.fromStatus && event.toStatus && (
                            <div className={styles.statusTransition}>
                              <span className={styles.transitionFrom}>{event.fromStatus}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                              <span className={styles.transitionTo}>{event.toStatus}</span>
                            </div>
                          )}

                          {event.comment && (
                            <div className={styles.timelineComment}>
                              &ldquo;{event.comment}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Execution Comments Section */}
            <div className={styles.commentSection}>
              <label className={styles.commentLabel}>
                Execution Notes &amp; Audit Comments
              </label>
              <textarea
                className={styles.commentTextarea}
                rows="3"
                placeholder={
                  isViewer
                    ? 'Read-only viewer mode...'
                    : canApproveOrReject
                    ? 'Enter approval notes or mandatory rejection reason...'
                    : isSelfMakerSubmission
                    ? 'Read-only: You submitted this task as Maker (Segregation of Duties)'
                    : 'Enter task execution summary, tax deposit reference, or upload comments...'
                }
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={isViewer || (!canSubmit && !canApproveOrReject)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Close
            </button>

            <div className={styles.actionButtons}>
              {canSubmit && (
                <button
                  type="button"
                  className={`${styles.submitBtn} ${styles.blueBtn}`}
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
                    className={`${styles.submitBtn} ${styles.rejectBtn}`}
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
                    className={`${styles.submitBtn} ${styles.approveBtn}`}
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
            <div className={styles.rejectionOptionsBox} style={{ width: '100%', margin: '14px 0 20px', textAlign: 'left' }}>
              <span className={styles.rejectionOptionsLabel}>Select Action Mode:</span>
              <div className={styles.rejectionRadioGroup}>
                <label className={`${styles.radioLabel} ${rejectionMode === 'resubmit' ? styles.radioSelected : ''}`}>
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="resubmit"
                    checked={rejectionMode === 'resubmit'}
                    onChange={() => setRejectionMode('resubmit')}
                  />
                  <div>
                    <strong>Return to Maker for Re-submission</strong>
                    <p>Sends task back to Maker pool so evidence/notes can be corrected and submitted again</p>
                  </div>
                </label>

                <label className={`${styles.radioLabel} ${rejectionMode === 'permanent' ? styles.radioSelectedDanger : ''}`}>
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="permanent"
                    checked={rejectionMode === 'permanent'}
                    onChange={() => setRejectionMode('permanent')}
                  />
                  <div>
                    <strong>Permanently Reject Task</strong>
                    <p>Closes task lifecycle permanently — no further submissions or changes allowed</p>
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

import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmationModal from './ConfirmationModal';
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
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // 'SUBMIT' | 'APPROVE' | 'REJECT'

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setActionError('');
      setPendingConfirm(null);
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

  function triggerConfirm(actionType) {
    setActionError('');
    if (actionType === 'REJECT' && !comment.trim()) {
      setActionError('Please provide a mandatory reason for rejection.');
      return;
    }
    setPendingConfirm(actionType);
  }

  async function handleAction(actionType) {
    setActionError('');
    try {
      setSubmitting(true);
      if (actionType === 'SUBMIT') {
        await onSubmitTask(task, comment);
      } else if (actionType === 'APPROVE') {
        await onApproveTask(task, comment);
      } else if (actionType === 'REJECT') {
        if (!comment.trim()) {
          setActionError('Please provide a mandatory reason for rejection.');
          setSubmitting(false);
          setPendingConfirm(null);
          return;
        }
        await onRejectTask(task, comment);
      }
      onClose();
    } catch (err) {
      setActionError(err.message || 'Action failed');
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
    title: 'Confirm Task Rejection?',
    message: 'Are you sure you want to reject this compliance task? This will send the task back to the Maker pool for corrections.',
    confirmText: 'Yes, Reject Task',
    confirmVariant: 'danger',
  } : null;

  return (
    <>
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
                <p>{task.record} • {task.entity}</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content Body */}
          <div className={styles.modalBody}>
            {actionError && (
              <div className={styles.alertError}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}

            {/* Task Metadata Cards */}
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>SOP Procedure</span>
                <span className={styles.detailValueBold}>{task.sop}</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <div>
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Entity &amp; Recurrence</span>
                <span className={styles.detailValue}>{task.entity} ({task.period})</span>
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
                    <span>Reject</span>
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
        />
      )}
    </>
  );
}

import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';
import styles from './SopDetailModal.module.css';

export default function AssignedSopDetailsModal({ isOpen, sop, onClose, onDelete }) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  if (!isOpen || !sop) return null;

  const historyLength = (sop.history && sop.history.length > 0) ? sop.history.length : 1;

  const isPendingCreation = sop.status === 'PENDING_CREATION';
  const isPendingApproval = sop.status === 'PENDING_APPROVAL';
  const isActive = sop.status === 'ACTIVE' || sop.status === 'APPROVED';
  const isRejected = sop.status === 'REJECTED';

  const creatorName = sop.assignedCreatorName || sop.assignedCreatorId || 'Creator';
  const approverName = sop.assignedApproverName || sop.assignedApproverId || 'Approver';
  const adminName = sop.createdByName || 'Manoj Agarwal';

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <h3>SOP Creation Assignment</h3>
              <div className={styles.badges}>
                <span className={styles.codeBadge}>{sop.code || sop.sopCode}</span>
                {isPendingCreation && <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING CREATION</span>}
                {isPendingApproval && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING APPROVAL</span>}
                {isActive && <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>ACTIVE</span>}
                {isRejected && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>REJECTED</span>}
              </div>
            </div>

            <div className={styles.headerRightGroup}>
              <button
                type="button"
                className={styles.historyHeaderBtn}
                onClick={() => setShowActivityLogModal(true)}
                title="Open SOP Activity Log & Audit Trail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Activity Log</span>
                <span className={styles.historyBadgeCount}>{historyLength}</span>
              </button>

              <button className={styles.closeBtn} onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.body}>
            {/* Visual SOP Governance Lifecycle Progress Flow */}
            <div className={styles.lifecycleTracker}>
              <div className={styles.lifecycleTitle}>SOP Governance Lifecycle Flow</div>
              <div className={styles.flowSteps}>
                {/* Step 1: Admin Assignment */}
                <div className={`${styles.flowStep} ${styles.completedStep}`}>
                  <div className={styles.stepBadge}>1</div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>Admin Assignment</span>
                    <span className={styles.stepDetail}>Assigned by {adminName}</span>
                  </div>
                </div>

                <div className={`${styles.flowConnector} ${!isPendingCreation ? styles.activeConnector : ''}`} />

                {/* Step 2: Creator Submission */}
                <div className={`${styles.flowStep} ${isPendingCreation ? styles.currentStep : styles.completedStep}`}>
                  <div className={styles.stepBadge}>2</div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>Creator Draft</span>
                    <span className={styles.stepDetail}>
                      {isPendingCreation ? `Pending ${creatorName} Draft` : `Submitted by ${creatorName}`}
                    </span>
                  </div>
                </div>

                <div className={`${styles.flowConnector} ${isActive || isRejected ? styles.activeConnector : ''}`} />

                {/* Step 3: Approver Outcome */}
                <div className={`${styles.flowStep} ${
                  isActive ? styles.approvedStep :
                  isRejected ? styles.rejectedStep :
                  isPendingApproval ? styles.currentStep :
                  styles.pendingStep
                }`}>
                  <div className={styles.stepBadge}>
                    {isActive ? '✓' : isRejected ? '↺' : '3'}
                  </div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepName}>
                      {isActive ? 'Active & Scheduled' : isRejected ? 'Rejected & Returned' : 'Approver Outcome'}
                    </span>
                    <span className={styles.stepDetail}>
                      {isActive ? `Approved by ${approverName}` : isRejected ? `Rejected by ${approverName}` : `Pending ${approverName} Review`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.label}>Corporate Entity</span>
                <span className={styles.value}>{sop.entity || sop.entityName || sop.entityCode}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Locked Process Category</span>
                <span className={styles.value}>{sop.process || sop.processCategory}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Assigned Creator (Drafting)</span>
                <span className={styles.value} style={{ fontWeight: 600, color: '#0f172a' }}>
                  {sop.assignedCreatorName || sop.assignedCreatorId || 'N/A'}
                </span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Assigned Approver (Reviewing)</span>
                <span className={styles.value} style={{ fontWeight: 600, color: '#0f172a' }}>
                  {sop.assignedApproverName || sop.assignedApproverId || 'N/A'}
                </span>
              </div>
            </div>

            {sop.rejectionReason && (
              <div className={styles.field} style={{ marginTop: 14 }}>
                <span className={styles.label} style={{ color: '#b91c1c' }}>Rejection / Revision Feedback</span>
                <div className={styles.descBox} style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
                  {sop.rejectionReason}
                </div>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Close
            </button>

            {onDelete && (
              <button
                type="button"
                className={styles.btnDanger}
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

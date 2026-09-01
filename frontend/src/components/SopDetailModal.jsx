import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';
import styles from './SopDetailModal.module.css';

const FREQ_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', DAILY: 'Daily', WEEKLY: 'Weekly' };

export default function SopDetailModal({
  isOpen,
  sop,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  if (!isOpen || !sop) return null;

  const makersList = sop.makers?.length ? sop.makers : (sop.maker ? [sop.maker] : ['Tushar Seth', 'Prayasa Sharma']);
  const checkersList = sop.checkers?.length ? sop.checkers : (sop.checker ? [sop.checker] : ['Vivek Raj', 'Mainak Gupta']);

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
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <h3>{sop.name || sop.title}</h3>
              <div className={styles.badges}>
                <span className={styles.codeBadge}>{sop.code || sop.sopCode}</span>
                <span className={styles.versionBadge}>v{sop.version || 1}</span>
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
                <span className={styles.label}>Process Category</span>
                <span className={styles.value}>{sop.process || sop.processCategory}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Frequency</span>
                <span className={styles.value}>{sop.isRecurring ? (FREQ_LABEL[sop.frequency] || sop.frequency) : 'N/A (One-Time Task)'}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Due Day Offset</span>
                <span className={styles.value}>Day {sop.dueDay || sop.dueDayOffset}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Scheduling Mode</span>
                <span className={styles.value}>
                  {sop.isRecurring ? (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                      Recurring Schedule
                    </span>
                  ) : (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                      One-Time Task
                    </span>
                  )}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Governance Status</span>
                <span className={styles.value}>
                  {sop.status === 'PENDING_CREATION' && <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING CREATION</span>}
                  {sop.status === 'PENDING_APPROVAL' && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING APPROVAL</span>}
                  {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>ACTIVE (APPROVED)</span>}
                  {sop.status === 'REJECTED' && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>REJECTED</span>}
                </span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Assigned Creator</span>
                <span className={styles.value} style={{ fontWeight: 600, color: '#1e293b' }}>{creatorName}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Assigned Approver</span>
                <span className={styles.value} style={{ fontWeight: 600, color: '#1e293b' }}>{approverName}</span>
              </div>
            </div>

            {sop.rejectionReason && (
              <div className={styles.field} style={{ marginBottom: 12 }}>
                <span className={styles.label} style={{ color: '#b91c1c' }}>Rejection Comments</span>
                <div className={styles.descBox} style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
                  {sop.rejectionReason}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <span className={styles.label}>Description</span>
              <div className={styles.descBox}>
                {sop.description && sop.description.trim() ? sop.description : 'No description provided.'}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Assigned Maker Pool</span>
              <div className={styles.poolBox}>
                {makersList.map((m, idx) => (
                  <span key={idx} className={styles.poolBadge}>{m}</span>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Assigned Checker Pool</span>
              <div className={styles.poolBox}>
                {checkersList.map((c, idx) => (
                  <span key={idx} className={styles.poolBadge}>{c}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Close
            </button>

            {sop.status === 'PENDING_APPROVAL' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    onClose();
                    if (onApprove) onApprove(sop);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Approve &amp; Activate SOP
                </button>
                <button
                  type="button"
                  style={{ background: '#be123c', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    onClose();
                    if (onReject) onReject(sop);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reject SOP
                </button>
              </div>
            )}

            {isAdmin && sop.status !== 'PENDING_APPROVAL' && (
              <div className={styles.adminActions}>
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
                  Delete SOP
                </button>

                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    onClose();
                    onEdit(sop);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit SOP
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

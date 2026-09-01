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
  if (!isOpen || !sop) return null;

  const makersList = sop.makers?.length ? sop.makers : (sop.maker ? [sop.maker] : ['Tushar Seth', 'Prayasa Sharma']);
  const checkersList = sop.checkers?.length ? sop.checkers : (sop.checker ? [sop.checker] : ['Vivek Raj', 'Mainak Gupta']);

  return (
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
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
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
              <span className={styles.value}>{FREQ_LABEL[sop.frequency] || sop.frequency}</span>
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
              <span className={styles.value} style={{ fontWeight: 600, color: '#1e293b' }}>{sop.assignedCreatorName || sop.assignedCreatorId || 'N/A'}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Assigned Approver</span>
              <span className={styles.value} style={{ fontWeight: 600, color: '#1e293b' }}>{sop.assignedApproverName || sop.assignedApproverId || 'N/A'}</span>
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
              {sop.description || 'Standard operating procedure defined for financial compliance and statutory remittance verification.'}
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
  );
}

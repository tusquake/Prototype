import styles from './SopDetailModal.module.css';

export default function AssignedSopDetailsModal({ isOpen, sop, onClose, onDelete }) {
  if (!isOpen || !sop) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3>SOP Creation Assignment</h3>
            <div className={styles.badges}>
              <span className={styles.codeBadge}>{sop.code || sop.sopCode}</span>
              {sop.status === 'PENDING_CREATION' && <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING CREATION</span>}
              {sop.status === 'PENDING_APPROVAL' && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>PENDING APPROVAL</span>}
              {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>ACTIVE</span>}
              {sop.status === 'REJECTED' && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>REJECTED</span>}
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
  );
}

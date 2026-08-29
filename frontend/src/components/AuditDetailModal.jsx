import styles from './AuditDetailModal.module.css';

export function formatActionLabel(action) {
  if (!action) return '';
  const map = {
    'SUBMIT_TASK': 'Submit Task',
    'APPROVE_TASK': 'Approve Task',
    'REJECT_TASK': 'Reject Task',
    'CREATE_SOP': 'Create SOP',
  };
  if (map[action]) return map[action];
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditDetailModal({ isOpen, log, onClose }) {
  if (!isOpen || !log) return null;

  function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    try {
      const date = new Date(ts);
      return date.toUTCString();
    } catch {
      return ts;
    }
  }

  function getActionBadgeStyle(action) {
    const act = (action || '').toUpperCase();
    if (act.includes('SUBMIT')) return { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' };
    if (act.includes('APPROVE')) return { color: '#059669', background: 'rgba(5, 150, 105, 0.1)' };
    if (act.includes('REJECT')) return { color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' };
    return { color: '#7c3aed', background: 'rgba(124, 58, 237, 0.1)' };
  }

  const badgeStyle = getActionBadgeStyle(log.action);
  const actionText = formatActionLabel(log.action);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <h3>Audit Event Record Details</h3>
              <p>Audit ID #{log.auditId} • {log.entityType}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Details Grid */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Event Action</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6, width: 'fit-content', ...badgeStyle }}>
                {actionText}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Timestamp (UTC)</span>
              <span className={styles.detailValue}>{formatTimestamp(log.timestamp)}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Actor Name</span>
              <span className={styles.detailValue} style={{ fontWeight: 600 }}>
                {log.actorName || log.actorId}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Actor Email / User ID</span>
              <span className={styles.detailValueMono}>
                {log.actorEmail || log.actorId}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Component / Entity Type</span>
              <span className={styles.detailValue}>{log.entityType}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Target Record / Entity ID</span>
              <span className={styles.detailValue} style={{ fontWeight: 600, color: '#091124' }}>
                {log.entityId}
              </span>
            </div>



            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
              <span className={styles.detailLabel}>Audit Log Summary &amp; Notes</span>
              <div className={styles.commentBox}>
                {log.action === 'SUBMIT_TASK'
                  ? `Task [${log.entityId}] submitted for Checker pool review by ${log.actorName || log.actorId}. State transitioned from OPEN to PENDING_REVIEW.`
                  : log.action === 'APPROVE_TASK'
                  ? `Task [${log.entityId}] reviewed and approved by Checker ${log.actorName || log.actorId}. State transitioned to APPROVED.`
                  : log.action === 'REJECT_TASK'
                  ? `Task [${log.entityId}] rejected with correction requirements by Checker ${log.actorName || log.actorId}. State transitioned to REJECTED.`
                  : log.action === 'CREATE_SOP'
                  ? `Master Standard Operating Procedure [${log.entityId}] registered and configured by ${log.actorName || log.actorId}.`
                  : `Compliance event [${actionText}] executed by user [${log.actorName || log.actorId}].`}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <span className={styles.readOnlyTag}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Strict Read-Only Mode
          </span>
          <button className={styles.closeModalBtn} onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

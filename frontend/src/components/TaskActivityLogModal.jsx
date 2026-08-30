import styles from './TaskActivityLogModal.module.css';

export default function TaskActivityLogModal({ isOpen, onClose, task }) {
  if (!isOpen || !task) return null;

  const isSubmittedOrDone = task.status === 'PENDING_REVIEW' || task.status === 'APPROVED' || task.status === 'REJECTED' || task.status === 'PERMANENTLY_REJECTED';

  const rawHistory = (task.history && task.history.length > 0) ? task.history : [];
  const hasCreate = rawHistory.some(h => (h.action || '').toUpperCase().includes('CREATE'));

  const historyEvents = hasCreate
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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3>Task Activity Log &amp; Audit Trail</h3>
              <p>{task.record || task.recordNo} • {task.entity || task.entityName}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.timelineList}>
            {historyEvents.map((event, idx) => {
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
                <div key={event.eventId || idx} className={styles.timelineCard}>
                  <div className={`${styles.timelineIcon} ${badgeCls}`}>
                    {act.includes('APPROVE') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : act.includes('REJECT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : act.includes('RESUBMIT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    ) : act.includes('SUBMIT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                    )}
                  </div>

                  <div className={styles.timelineDetails}>
                    <div className={styles.headerRow}>
                      <span className={styles.actionTitle}>{actionLabel}</span>
                      <span className={styles.timestamp}>
                        {event.timestamp ? new Date(event.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : 'Just now'}
                      </span>
                    </div>

                    <div className={styles.actorRow}>
                      <span>Performed by: <strong>{event.actorName || 'System'}</strong></span>
                    </div>

                    {event.fromStatus && event.toStatus && (
                      <div className={styles.transitionPill}>
                        Status Transition: <code>{event.fromStatus}</code> ➔ <code>{event.toStatus}</code>
                      </div>
                    )}

                    {event.comment && (
                      <div className={styles.commentBox}>
                        <strong>Execution Notes:</strong> &ldquo;{event.comment}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

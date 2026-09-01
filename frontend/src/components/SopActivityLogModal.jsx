import styles from './TaskActivityLogModal.module.css';

export default function SopActivityLogModal({ isOpen, onClose, sop }) {
  if (!isOpen || !sop) return null;

  const rawHistory = (sop.history && sop.history.length > 0) ? sop.history : [];
  const hasAssign = rawHistory.some(h => (h.action || '').toUpperCase().includes('ASSIGN'));

  const historyEvents = hasAssign
    ? rawHistory
    : [
        {
          eventId: 0,
          action: 'ASSIGN_SOP',
          actorName: sop.assignedCreatorName || 'Admin Governance',
          fromStatus: null,
          toStatus: 'PENDING_CREATION',
          comment: 'SOP creation task assigned to creator',
          timestamp: new Date().toISOString(),
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h3>SOP Event History &amp; Audit Trail</h3>
              <p>{sop.code || sop.sopCode} • {sop.name || sop.title || sop.processCategory}</p>
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
              const actionLabel = act.includes('ASSIGN') ? 'SOP Creation Assigned' :
                                  act.includes('SUBMIT') ? 'SOP Draft Submitted' :
                                  act.includes('APPROVE') ? 'SOP Approved & Activated' :
                                  act.includes('REJECT') ? 'SOP Draft Rejected' :
                                  act.includes('UPDATE') ? 'SOP Updated' :
                                  act.includes('CREATE') ? 'SOP Created' : event.action;

              const badgeCls = act.includes('APPROVE') ? styles.historyApprove :
                               act.includes('REJECT') ? styles.historyReject :
                               act.includes('SUBMIT') ? styles.historySubmit :
                               act.includes('ASSIGN') ? styles.historyResubmit : styles.historyCreate;

              return (
                <div key={event.eventId || idx} className={styles.timelineCard}>
                  <div className={`${styles.timelineIcon} ${badgeCls}`}>
                    {act.includes('APPROVE') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : act.includes('REJECT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                      <span>Performed by: <strong>{event.actorName || 'Admin Governance'}</strong> ({event.actorRole || 'ADMIN'})</span>
                    </div>

                    {event.fromStatus && event.toStatus && (
                      <div className={styles.transitionPill}>
                        Status Transition: <code>{event.fromStatus}</code> ➔ <code>{event.toStatus}</code>
                      </div>
                    )}

                    {event.comment && (
                      <div className={styles.commentBox}>
                        <strong>Notes / Feedback:</strong> &ldquo;{event.comment}&rdquo;
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

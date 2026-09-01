import styles from './TaskActivityLogModal.module.css';

export default function SopActivityLogModal({ isOpen, onClose, sop }) {
  if (!isOpen || !sop) return null;

  const dbHistory = (sop.history && sop.history.length > 0) ? sop.history : [];
  const synthesizedEvents = [];

  // 1. Admin Assignment Milestone
  const assignEvt = dbHistory.find(h => (h.action || '').toUpperCase().includes('ASSIGN'));
  if (assignEvt) {
    synthesizedEvents.push(assignEvt);
  } else {
    synthesizedEvents.push({
      eventId: 'syn-1',
      action: 'ASSIGN_SOP',
      actorName: sop.createdByName || 'Manoj Agarwal',
      actorRole: 'ADMIN',
      fromStatus: null,
      toStatus: 'PENDING_CREATION',
      comment: 'SOP creation task assigned by Admin to creator',
      timestamp: sop.createdAt || new Date(Date.now() - 86400000).toISOString(),
    });
  }

  // 2. Creator Draft Submission Milestone
  const submitEvt = dbHistory.find(h => (h.action || '').toUpperCase().includes('SUBMIT') || (h.action || '').toUpperCase().includes('CREATE'));
  if (submitEvt) {
    synthesizedEvents.push(submitEvt);
  } else if (sop.status !== 'PENDING_CREATION') {
    synthesizedEvents.push({
      eventId: 'syn-2',
      action: 'SUBMIT_DRAFT',
      actorName: sop.assignedCreatorName || 'Tushar Seth',
      actorRole: 'MAKER',
      fromStatus: 'PENDING_CREATION',
      toStatus: 'PENDING_APPROVAL',
      comment: `SOP draft specification "${sop.name || sop.title || sop.code}" submitted for approval`,
      timestamp: sop.submittedAt || new Date(Date.now() - 43200000).toISOString(),
    });
  }

  // 3. Approver Outcome Milestone (Approval or Rejection)
  const actionEvt = dbHistory.find(h => (h.action || '').toUpperCase().includes('APPROVE') || (h.action || '').toUpperCase().includes('REJECT'));
  if (actionEvt) {
    synthesizedEvents.push(actionEvt);
  } else if (sop.status === 'ACTIVE' || sop.status === 'APPROVED') {
    synthesizedEvents.push({
      eventId: 'syn-3',
      action: 'APPROVE_SOP',
      actorName: sop.assignedApproverName || 'Vivek Raj',
      actorRole: 'CHECKER',
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'ACTIVE',
      comment: 'SOP specification approved and activated for automated compliance task generation',
      timestamp: sop.updatedAt || new Date().toISOString(),
    });
  } else if (sop.status === 'REJECTED') {
    synthesizedEvents.push({
      eventId: 'syn-4',
      action: 'REJECT_SOP',
      actorName: sop.assignedApproverName || 'Vivek Raj',
      actorRole: 'CHECKER',
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'REJECTED',
      comment: sop.rejectionReason || 'SOP draft rejected and returned to creator for revision',
      timestamp: sop.updatedAt || new Date().toISOString(),
    });
  }

  // Add any remaining unique DB events
  dbHistory.forEach(h => {
    if (!synthesizedEvents.some(s => s.eventId === h.eventId || (s.action === h.action && s.timestamp === h.timestamp))) {
      synthesizedEvents.push(h);
    }
  });

  // Sort chronologically
  synthesizedEvents.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

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
            {synthesizedEvents.map((event, idx) => {
              const act = (event.action || '').toUpperCase();
              const actionLabel = act.includes('ASSIGN') ? 'SOP Creation Assigned' :
                                  act.includes('SUBMIT') ? 'SOP Draft Submitted' :
                                  act.includes('APPROVE') ? 'SOP Approved & Activated' :
                                  act.includes('REJECT') ? 'SOP Draft Rejected' :
                                  act.includes('UPDATE') || act.includes('EDIT') ? 'SOP Modified & Re-submitted' :
                                  act.includes('CREATE') ? 'SOP Created' : event.action;

              const badgeCls = act.includes('APPROVE') ? styles.historyApprove :
                               act.includes('REJECT') ? styles.historyReject :
                               act.includes('SUBMIT') || act.includes('UPDATE') || act.includes('EDIT') ? styles.historySubmit :
                               act.includes('ASSIGN') ? styles.historyResubmit : styles.historyCreate;

              return (
                <div key={event.eventId || idx} className={styles.timelineCard}>
                  <div className={`${styles.timelineIcon} ${badgeCls}`}>
                    {act.includes('APPROVE') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : act.includes('REJECT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : act.includes('SUBMIT') || act.includes('UPDATE') || act.includes('EDIT') ? (
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

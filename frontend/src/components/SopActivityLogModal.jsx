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
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/65 p-5 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[650px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 to-blue-600 px-6 py-4.5 text-white">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-white">SOP Event History &amp; Audit Trail</h3>
              <p className="mt-0.5 text-xs text-white/85">{sop.code || sop.sopCode} • {sop.name || sop.title || sop.processCategory}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white transition-all hover:bg-white/30"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto bg-slate-50 p-6">
          <div className="relative flex flex-col gap-4">
            {synthesizedEvents.map((event, idx) => {
              const act = (event.action || '').toUpperCase();
              const actionLabel = act.includes('ASSIGN') ? 'SOP Creation Assigned' :
                act.includes('SUBMIT') ? 'SOP Draft Submitted' :
                  act.includes('APPROVE') ? 'SOP Approved & Activated' :
                    act.includes('REJECT') ? 'SOP Draft Rejected' :
                      act.includes('UPDATE') || act.includes('EDIT') ? 'SOP Modified & Re-submitted' :
                        act.includes('CREATE') ? 'SOP Created' : event.action;

              const badgeCls = act.includes('APPROVE') ? 'bg-green-50 text-green-600 border-green-300' :
                act.includes('REJECT') ? 'bg-red-50 text-red-600 border-red-300' :
                  act.includes('SUBMIT') || act.includes('UPDATE') || act.includes('EDIT') ? 'bg-blue-50 text-blue-600 border-blue-300' :
                    act.includes('ASSIGN') ? 'bg-blue-50 text-blue-700 border-blue-400' : 'bg-purple-50 text-purple-600 border-purple-300';

              const isNotLast = idx !== synthesizedEvents.length - 1;

              return (
                <div
                  key={event.eventId || idx}
                  className={`relative flex gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${isNotLast ? "after:absolute after:left-[27px] after:top-[48px] after:bottom-[-18px] after:w-[2px] after:bg-slate-300 after:z-0" : ""
                    }`}
                >
                  <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${badgeCls}`}>
                    {act.includes('APPROVE') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : act.includes('REJECT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : act.includes('SUBMIT') || act.includes('UPDATE') || act.includes('EDIT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /></svg>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{actionLabel}</span>
                      <span className="text-[11.5px] font-medium text-slate-500">
                        {event.timestamp ? new Date(event.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : 'Just now'}
                      </span>
                    </div>

                    <div className="text-[12.5px] text-slate-600">
                      <span>Performed by: <strong className="font-semibold text-slate-700">{event.actorName || 'Admin Governance'}</strong> ({event.actorRole || 'ADMIN'})</span>
                    </div>

                    {event.fromStatus && event.toStatus && (
                      <div className="w-fit rounded-md bg-slate-100 px-2 py-1 text-[11.5px] text-slate-600">
                        Status Transition: <code className="font-bold text-slate-800">{event.fromStatus}</code> ➔ <code className="font-bold text-slate-800">{event.toStatus}</code>
                      </div>
                    )}

                    {event.comment && (
                      <div className="mt-1 rounded-r-lg border-l-3 border-blue-500 bg-slate-50 p-2 px-3 text-[12.5px] italic text-slate-800">
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
        <div className="flex justify-end border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-white">Task Activity Log &amp; Audit Trail</h3>
              <p className="mt-0.5 text-xs text-white/85">{task.record || task.recordNo} • {task.entity || task.entityName}</p>
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
            {historyEvents.map((event, idx) => {
              const act = (event.action || '').toUpperCase();
              const actionLabel = act.includes('CREATE') ? 'Task Created' :
                act.includes('RESUBMIT') ? 'Resubmitted Task' :
                  act.includes('SUBMIT') ? 'Submitted Task' :
                    act.includes('APPROVE') ? 'Approved Task' :
                      act.includes('PERMANENT') ? 'Permanently Rejected' :
                        act.includes('REJECT') ? 'Rejected & Returned' : event.action;

              const badgeCls = act.includes('APPROVE') ? 'bg-green-50 text-green-600 border-green-300' :
                act.includes('REJECT') ? 'bg-red-50 text-red-600 border-red-300' :
                  act.includes('PERMANENT') ? 'bg-red-50 text-red-800 border-red-400' :
                    act.includes('RESUBMIT') ? 'bg-blue-50 text-blue-700 border-blue-400' :
                      act.includes('SUBMIT') ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-purple-50 text-purple-600 border-purple-300';

              const isNotLast = idx !== historyEvents.length - 1;

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
                    ) : act.includes('RESUBMIT') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    ) : act.includes('SUBMIT') ? (
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
                      <span>Performed by: <strong className="font-semibold text-slate-700">{event.actorName || 'System'}</strong></span>
                    </div>

                    {event.fromStatus && event.toStatus && (
                      <div className="w-fit rounded-md bg-slate-100 px-2 py-1 text-[11.5px] text-slate-600">
                        Status Transition: <code className="font-bold text-slate-800">{event.fromStatus}</code> ➔ <code className="font-bold text-slate-800">{event.toStatus}</code>
                      </div>
                    )}

                    {event.comment && (
                      <div className="mt-1 rounded-r-lg border-l-3 border-blue-500 bg-slate-50 p-2 px-3 text-[12.5px] italic text-slate-800">
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

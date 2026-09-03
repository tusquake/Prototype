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
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#091124]/60 p-5 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f1e47] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <h3 className="mb-0.5 text-[17px] font-bold text-white">Audit Event Record Details</h3>
              <p className="m-0 text-[12.5px] text-slate-400">Audit ID #{log.auditId} • {log.entityType}</p>
            </div>
          </div>
          <button
            className="flex items-center justify-center rounded-md bg-transparent p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Event Action</span>
              <span
                className="w-fit rounded-md px-2.5 py-1 text-[12.5px] font-bold"
                style={badgeStyle}
              >
                {actionText}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Timestamp (UTC)</span>
              <span className="text-[13.5px] font-medium text-slate-900">{formatTimestamp(log.timestamp)}</span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Actor Name</span>
              <span className="text-[13.5px] font-semibold text-slate-900">
                {log.actorName || log.actorId}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Actor Email / User ID</span>
              <span className="w-fit rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                {log.actorEmail || log.actorId}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Component / Entity Type</span>
              <span className="text-[13.5px] font-medium text-slate-900">{log.entityType}</span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Target Record / Entity ID</span>
              <span className="text-[13.5px] font-semibold text-[#091124]">
                {log.entityId}
              </span>
            </div>

            <div className="col-span-2 flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 px-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Audit Log Summary &amp; Notes</span>
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3.5 text-d-13 leading-relaxed text-slate-700">
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
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.25 text-xs font-semibold text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Strict Read-Only Mode
          </span>
          <button
            className="rounded-lg bg-blue-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

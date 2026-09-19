import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';

const FREQ_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', DAILY: 'Daily', WEEKLY: 'Weekly' };

export default function SopDetailModal({
  isOpen,
  sop,
  userMap = {},
  onClose,
}) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  if (!isOpen || !sop) return null;

  // Safe user mapping helper
  const getUserName = (id) => userMap[id] || id;

  // Extract Pools safely using fallbacks based on your SOP object
  const makersList = sop.defaultMakerIds || sop.makers || [];
  const checkersList = sop.defaultCheckerIds || sop.checkers || [];
  const tasks = sop.taskTemplates || [];

  // Helper for Gantt Chart embedded inside the Drawer

  return (
    <>
      {/* Drawer Overlay - Changed to justify-end for right-side drawer */}
      <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
        
        {/* Drawer Container - Full height, wide width (900px) */}
        <div
          className="w-full max-w-[950px] h-full bg-white shadow-2xl flex flex-col animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 bg-white px-8 pb-5 pt-6 shrink-0">
            <div className="flex flex-col">
              <h3 className="mb-1 text-xl font-bold text-slate-900">{sop.name || sop.title}</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-600/10 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700">
                  {sop.code || sop.sopCode}
                </span>
                <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                  ${sop.status === 'ACTIVE' || sop.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    sop.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {sop.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-blue-700"
                onClick={() => setShowActivityLogModal(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Audit Logs</span>
              </button>

              <button className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900" onClick={onClose}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>

          {/* Scrollable Body - Split into 2 Columns */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
            <div className="grid grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: Metadata & Pools (col-span-4) */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                
                {/* Core Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">SOP Details</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Entity</span>
                      <span className="text-xs font-bold text-slate-800">{sop.entity || sop.entityCode}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Process</span>
                      <span className="text-xs font-bold text-slate-800">{sop.process || sop.processCategory}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Frequency</span>
                      <span className="text-xs font-bold text-slate-800">
                        {sop.isRecurring ? (FREQ_LABEL[sop.frequency] || sop.frequency) : 'One-Time'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Offset</span>
                      <span className="text-xs font-bold text-slate-800">Day {sop.dueDayOffset || sop.dueDay || 1}</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Start Date</span>
                      <span className="text-xs font-bold text-blue-700">{sop.effectiveFrom || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500">End Date</span>
                      <span className="text-xs font-bold text-slate-800">{sop.effectiveUntil || 'Indefinite'}</span>
                    </div>
                  </div>
                </div>

                {/* Master Pools */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">Master Pools</h4>
                  
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Maker Pool</span>
                    <div className="flex flex-wrap gap-1.5">
                      {makersList.length > 0 ? makersList.map((m, i) => (
                        <span key={i} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">{getUserName(m)}</span>
                      )) : <span className="text-[10px] italic text-slate-400">No Makers Assigned</span>}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Checker Pool</span>
                    <div className="flex flex-wrap gap-1.5">
                      {checkersList.length > 0 ? checkersList.map((c, i) => (
                        <span key={i} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">{getUserName(c)}</span>
                      )) : <span className="text-[10px] italic text-slate-400">No Checkers Assigned</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Timeline & Tasks (col-span-8) */}
              <div className="col-span-12 md:col-span-8 space-y-6">
                
                {/* Gantt Timeline */}
                <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-4 border-b border-blue-50 pb-2">Execution Timeline</h4>
                  <MiniGanttChart tasks={tasks} />
                </div>

                {/* Task Hierarchical List */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">
                    Task Template Details ({tasks.length})
                  </h4>
                  
                  {tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.sort((a, b) => a.stepSequence - b.stepSequence).map((task) => (
                        <div key={task.taskTemplateId} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                                {task.stepSequence}
                              </span>
                              <span className="text-[13px] font-bold text-slate-800">{task.taskName || task.title}</span>
                              <span className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                                {task.dependencyMode?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                              SLA: {task.slaHours}h
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-2 bg-white p-3 rounded-md border border-slate-100">
                            <div>
                              <span className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Makers</span>
                              <div className="flex flex-wrap gap-1">
                                {(task.makerIds || task.makers || []).map((m, i) => (
                                  <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{getUserName(m)}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Checkers</span>
                              <div className="flex flex-wrap gap-1">
                                {(task.checkerIds || task.checkers || []).map((c, i) => (
                                  <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{getUserName(c)}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {task.requiredDocuments?.length > 0 && (
                            <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                              <span className="block text-[9px] font-bold uppercase text-blue-700 mb-1.5">Required Documents</span>
                              <div className="flex flex-wrap gap-1.5">
                                {task.requiredDocuments.map((doc, i) => {
                                  const docName = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.documentName || 'Document');
                                  const docDesc = typeof doc === 'object' ? (doc.description || doc.desc || '') : '';
                                  return (
                                    <span key={i} className="text-[10px] font-semibold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1">
                                      <span>📄 {docName}</span>
                                      {docDesc && <span className="font-normal text-slate-500">({docDesc})</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No tasks defined for this SOP.
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-slate-200 bg-white px-8 py-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              className="rounded-lg bg-slate-800 px-8 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-900 shadow-sm"
              onClick={onClose}
            >
              Close Viewer
            </button>
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

  function MiniGanttChart({ tasks }) {
    if (!tasks || tasks.length === 0) return <div className="text-xs text-slate-400 italic">No tasks assigned.</div>;
    const maxDay = Math.max(1, ...tasks.map(t => t.etaEndDay || 0));
    const totalDuration = maxDay;
    const getPos = (day) => Math.max(0, Math.min(100, ((day || 0) / totalDuration) * 100));

    return (
      <div className="w-full space-y-2 font-sans overflow-x-auto pb-2">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-12 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase text-slate-400">
            <div className="col-span-5">Task Sequence</div>
            <div className="col-span-7 relative flex justify-between px-1">
              <span>Day 0</span>
              <span>Day {maxDay}</span>
            </div>
          </div>
          <div className="relative space-y-2 mt-2">
            {tasks.sort((a, b) => a.stepSequence - b.stepSequence).map((task, idx) => {
              const startPos = getPos(task.etaStartDay || 0);
              const endPos = getPos(task.etaEndDay || 0);
              const width = Math.max(2, endPos - startPos);

              return (
                <div key={task.taskTemplateId || idx} className="grid grid-cols-12 items-center text-xs">
                  <div className="col-span-5 truncate pr-2 font-medium text-slate-700 flex items-center gap-1.5">
                    <span className="font-bold text-blue-600 shrink-0">{task.stepSequence}.</span>
                    <span className="truncate" title={task.taskName || task.title}>
                      {task.taskName || task.title}
                    </span>
                  </div>
                  <div className="col-span-7 relative h-6 rounded bg-slate-100 flex items-center px-1">
                    <div
                      className="absolute h-4 rounded px-1.5 text-[9px] font-bold text-white flex items-center justify-between shadow-sm bg-blue-600 transition-all"
                      style={{
                        left: `${startPos}%`,
                        width: `${width}%`,
                        minWidth: '55px',
                      }}
                    >
                      <span className="truncate pr-1">Day {task.etaEndDay || 0}</span>
                      {task.requiredDocuments?.length > 0 && (
                        <span className="shrink-0 rounded bg-black/25 px-1 text-[8px]">
                          📄{task.requiredDocuments.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
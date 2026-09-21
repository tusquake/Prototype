import { useState } from 'react';
import SopActivityLogModal from './SopActivityLogModal';
import UserAvatarGroup from './UserAvatarGroup';
import dayjs from 'dayjs';

const FREQ_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', DAILY: 'Daily', WEEKLY: 'Weekly' };

function formatDate(date, formatConfig = 'DD MMM YYYY') {
  if (!date) return 'Invalid Date'
  return dayjs(date).format(formatConfig)
}

export default function SopDetailModal({
  isOpen,
  sop,
  userMap = {},
  onClose,
}) {
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'overview'

  if (!isOpen || !sop) return null;

  // Safe user mapping helper
  const getUserName = (id) => userMap[id] || id;

  // Extract Pools safely using fallbacks based on your SOP object
  const makersList = sop.defaultMakerIds || sop.makers || [];
  const checkersList = sop.defaultCheckerIds || sop.checkers || [];
  const tasks = sop.tasks || [];

  // Helper for Gantt Chart embedded inside the Drawer

  return (
    <>
      <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/65 backdrop-blur-sm animate-fade-in">

      <div className="absolute inset-0" onClick={onClose}/>
        {/* Drawer Container - Full height, wide width (950px) */}
        <div
          className="relative flex h-full w-full max-w-[1200px] flex-col bg-slate-50 shadow-2xl animate-[slideInRight_0.3s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header & Tabs Container */}
          <div className="bg-white shrink-0 shadow-sm z-10">
            {/* Header Top */}
            <div className="flex items-start justify-between px-8 pt-6 pb-4">
              <div className="flex flex-col">
                <h3 className="mb-1 text-xl font-bold text-slate-900">{sop.title || sop.name || 'SOP'}</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-600/10 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700">
                    {sop.sopCode || sop.code || ''}
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

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 px-8 gap-6">
              <button
                type="button"
                className={`pb-3 text-[13px] font-bold transition-all relative ${activeTab === 'tasks' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                onClick={() => setActiveTab('tasks')}
              >
                SOP Tasks
                {activeTab === 'tasks' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                )}
              </button>
              <button
                type="button"
                className={`pb-3 text-[13px] font-bold transition-all relative ${activeTab === 'overview' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                onClick={() => setActiveTab('overview')}
              >
                Timeline & Overview
                {activeTab === 'overview' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-8">

            {/* TAB 1: SOP TASKS */}
            {activeTab === 'tasks' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Execution Flow ({tasks.length} Tasks)
                  </h4>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime)).map((task) => (
                      <div key={task.taskId} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-bold text-slate-800">{task.recordNo || task.title}</span>
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                              {task.dependencyMode?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                            End Date: {formatDate(task.dueDateTime)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2 bg-white p-3 rounded-md border border-slate-100">
                          <div>
                            <span className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Makers</span>
                            <div className="flex flex-wrap gap-1">
                              {(task.assignedMakerNames).map((m, i) => (
                                  <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{m}</span>
                                ))}
                              {/* <UserAvatarGroup users={task.assignedMakerNames} max={3} /> */}
                            </div>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Checkers</span>
                            <div className="flex flex-wrap gap-1">
                               {(task.assignedCheckerNames).map((c, i) => (
                                  <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{c}</span>
                                ))}
                              {/* <UserAvatarGroup users={task.assignedCheckerNames} max={3} /> */}
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
            )}

            {/* TAB 2: OVERVIEW & TIMELINE */}
            {activeTab === 'overview' && (
              <>

                <div className='flex flex-col gap-4'>

                  <div className="col-span-12 lg:col-span-8">
                    <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-4 border-b border-blue-50 pb-2">Execution Timeline</h4>
                      <MiniGanttChart tasks={tasks} maxTimeline={sop.dueDateTime} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8">
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-full">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-5 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          SOP Details
                        </h4>

                        {/* 3-Column Grid for exactly 6 items */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entity</span>
                            <span className="text-sm font-semibold text-slate-800">{sop.entity || sop.entityCode}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Process</span>
                            <span className="text-sm font-semibold text-slate-800">{sop.process || sop.processCategory}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frequency</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {sop.isRecurring ? (FREQ_LABEL[sop.frequency] || sop.frequency) : 'One-Time'}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ETA</span>
                            <span className="text-sm font-semibold text-slate-800">{sop.dueDayOffset || sop.dueDay || 1} Days</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</span>
                            <span className="text-sm font-bold text-blue-600">{sop?.startDateTime ?? 'N/A'}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</span>
                            <span className="text-sm font-semibold text-slate-800">{sop?.dueDateTime ?? 'Indefinite'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col gap-5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          Master Pools
                        </h4>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Maker Pool</span>
                          <div className="flex flex-wrap gap-2">
                            {sop.defaultMakerNames.length > 0 ? sop.defaultMakerNames.map((m, i) => (
                              <span key={i} className="irounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
                                {m}
                              </span>
                            )) : <span className="text-[11px] italic text-slate-400">No Makers Assigned</span>}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Checker Pool</span>
                          <div className="flex flex-wrap gap-2">
                            {sop.defaultCheckerNames.length > 0 ? sop.defaultCheckerNames.map((c, i) => (
                              <span key={i} className="irounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
                                {c}
                              </span>
                            )) : <span className="text-[11px] italic text-slate-400">No Checkers Assigned</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </>

            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-slate-200 bg-white px-8 py-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
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

// function MiniGanttChart({ tasks }) {
//   if (!tasks || tasks.length === 0) return <div className="text-xs text-slate-400 italic">No tasks assigned.</div>;
//   const maxDay = Math.max(1, ...tasks.map(t => t.etaEndDay || 0));
//   const totalDuration = maxDay;
//   const getPos = (day) => Math.max(0, Math.min(100, ((day || 0) / totalDuration) * 100));

//   return (
//     <div className="w-full space-y-2 font-sans overflow-x-auto pb-2">
//       <div className="min-w-[400px]">
//         <div className="grid grid-cols-12 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase text-slate-400">
//           <div className="col-span-5">Task Sequence</div>
//           <div className="col-span-7 relative flex justify-between px-1">
//             <span>Day 0</span>
//             <span>Day {maxDay}</span>
//           </div>
//         </div>
//         <div className="relative space-y-2 mt-2">
//           {tasks.sort((a, b) => a.stepSequence - b.stepSequence).map((task, idx) => {
//             const startPos = getPos(task.etaStartDay || 0);
//             const endPos = getPos(task.etaEndDay || 0);
//             const width = Math.max(2, endPos - startPos);

//             return (
//               <div key={task.taskTemplateId || idx} className="grid grid-cols-12 items-center text-xs">
//                 <div className="col-span-5 truncate pr-2 font-medium text-slate-700 flex items-center gap-1.5">
//                   <span className="font-bold text-blue-600 shrink-0">{task.stepSequence}.</span>
//                   <span className="truncate" title={task.taskName || task.title}>
//                     {task.taskName || task.title}
//                   </span>
//                 </div>
//                 <div className="col-span-7 relative h-6 rounded bg-slate-100 flex items-center px-1">
//                   <div
//                     className="absolute h-4 rounded px-1.5 text-[9px] font-bold text-white flex items-center justify-between shadow-sm bg-blue-600 transition-all"
//                     style={{
//                       left: `${startPos}%`,
//                       width: `${width}%`,
//                       minWidth: '55px',
//                     }}
//                   >
//                     <span className="truncate pr-1">Day {task.etaEndDay || 0}</span>
//                     {task.requiredDocuments?.length > 0 && (
//                       <span className="shrink-0 rounded bg-black/25 px-1 text-[8px]">
//                         📄{task.requiredDocuments.length}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

//   function MiniGanttChart({ tasks = [], maxTimeline }) {
//   if (!tasks || tasks.length === 0) {
//     return (
//       <div className="py-8 text-center text-xs text-slate-400">
//         No task timeline data available. Please append task steps above.
//       </div>
//     );
//   }

//   console.log('Tasks',tasks)

//   // 1. Process tasks to chain them sequentially safely
//   let currentStartDay = 0;
//   const computedTasks = tasks.map((task) => {
//     const startDay = currentStartDay;
//     // Assuming etaEndDay is an absolute day. If it's a duration, change this to: startDay + (task.etaEndDay || 0)
//     const endDay = Math.max(startDay, task.dueDateTime);

//     // Set the start of the next task to the end of this one
//     currentStartDay = endDay;

//     return { ...task, startDay, endDay };
//   });

//   // 2. Calculate the max days for the timeline scale
//   const lastTaskEndDay = computedTasks[computedTasks.length - 1].endDay;

//   // Max scale is either the last task, the maxTimeline prop, or at least 1
//   const maxDay = Math.max(1, lastTaskEndDay, typeof maxTimeline === 'number' ? maxTimeline : 0);
//   const totalDuration = maxDay; // Since minDay is always 0

//   // 3. Helper to convert a day offset into a percentage for CSS positioning
//   const getPositionPercent = (day) => {
//     if (day === undefined || day === null) return 0;
//     return Math.max(0, Math.min(100, (day / totalDuration) * 100));
//   };

//   return (
//     <div className="min-w-[650px] space-y-3 font-sans">

//       {/* Chart Header - FULL WIDTH */}
//       <div className="relative flex justify-between border-b border-slate-200 pb-2 px-1 text-[10px] font-bold uppercase text-slate-400">
//         <span>{formatDate( tasks[0].startDateTime )}</span>
//         <span>Timeline View</span>
//         <span>Day {maxDay}</span>
//       </div>

//       {/* Chart Body - FULL WIDTH */}
//       <div className="relative space-y-2">
//         {computedTasks.map((task, idx) => {
//           const startPercent = getPositionPercent(task.startDay);
//           const endPercent = getPositionPercent(task.endDay);
//           const widthPercent = endPercent - startPercent;

//           return (
//             // The track background spans 100% of the width
//             <div key={task.id || idx} className="relative flex h-8 w-full items-center rounded bg-slate-100/70">

//               {/* The Blue Timeline Bar */}
//               <div
//                 className="absolute flex h-6 items-center justify-between rounded bg-blue-600 px-2.5 text-[10px] font-bold text-white shadow-sm transition-all"
//                 style={{
//                   left: `${startPercent}%`,
//                   width: `${widthPercent}%`,
//                   // max-content ensures the bar always fits the text even if width is 0.5%
//                   minWidth: 'max-content',
//                   // Optional: prevents it from overflowing the right side of the screen if left is 99%
//                   maxWidth: `calc(100% - ${startPercent}%)` 
//                 }}
//                 title={`Starts: Day ${task.startDay} | Ends: Day ${task.endDay}`}
//               >
//                 {/* Task Title inside the bar */}
//                 <span className="truncate pr-3">
//                 {task.title || task.taskName}
//                 </span>

//                 {/* Right side data inside the bar */}
//                 <div className="flex shrink-0 items-center gap-1.5">
//                   <span>Day {task.endDay}</span>
//                   {task.requiredDocuments?.length > 0 && (
//                     <span className="rounded bg-black/25 px-1 py-0.5 text-[9px] leading-none">
//                       📄{task.requiredDocuments.length}
//                     </span>
//                   )}
//                 </div>
//               </div>

//             </div>
//           );
//         })}
//       </div>

//     </div>
//   );
// }

function MiniGanttChart({ tasks = [] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No task timeline data available. Please append task steps above.
      </div>
    );
  }

  // 1. Find the absolute earliest start time and latest due time across all tasks
  // (We use .valueOf() to convert dates into raw milliseconds for math)
  const minTime = Math.min(
    ...tasks.map(t => dayjs(t.startDateTime || new Date()).valueOf())
  );

  let maxTime = Math.max(
    ...tasks.map(t => dayjs(t.dueDateTime || t.startDateTime || new Date()).valueOf())
  );

  // Prevent division by zero if all tasks start and end on the exact same millisecond
  if (maxTime <= minTime) {
    maxTime = minTime + 86400000; // Add 24 hours
  }

  const totalDurationMs = maxTime - minTime;

  // 2. Helper to convert a timestamp into a percentage for CSS positioning
  const getPositionPercent = (timestamp) => {
    if (!timestamp) return 0;
    return Math.max(0, Math.min(100, ((timestamp - minTime) / totalDurationMs) * 100));
  };

  return (
    <div className="min-w-[650px] space-y-3 font-sans">

      {/* Chart Header - Date Range */}
      <div className="relative flex justify-between border-b border-slate-200 pb-2 px-1 text-[10px] font-bold uppercase text-slate-400">
        <span>{dayjs(minTime).format('DD MMM YYYY')}</span>
        <span>Timeline View</span>
        <span>{dayjs(maxTime).format('DD MMM YYYY')}</span>
      </div>

      {/* Chart Body */}
      <div className="relative space-y-2">
        {tasks.map((task, idx) => {
          // Calculate percentages based on milliseconds
          const startMs = dayjs(task.startDateTime).valueOf();
          // Fallback to startMs if dueDateTime is null
          const endMs = task.dueDateTime ? dayjs(task.dueDateTime).valueOf() : startMs;

          const startPercent = getPositionPercent(startMs);
          const endPercent = getPositionPercent(endMs);
          const widthPercent = endPercent - startPercent;

          // Format dates for display
          const displayStart = dayjs(startMs).format('DD MMM');
          const displayEnd = dayjs(endMs).format('DD MMM');
          const fullHoverStart = dayjs(startMs).format('DD MMM YYYY, hh:mm A');
          const fullHoverEnd = dayjs(endMs).format('DD MMM YYYY, hh:mm A');

          return (
            <div key={task.id || idx} className="relative flex h-8 w-full items-center rounded bg-slate-100/70">

              {/* The Blue Timeline Bar */}
              <div
                className="absolute flex h-6 items-center justify-between rounded bg-blue-600 px-2.5 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-blue-700"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  minWidth: 'max-content', // Forces bar to fit the text even if duration is short
                  maxWidth: `calc(100% - ${startPercent}%)` // Prevents overflowing right edge
                }}
                title={`Starts: ${fullHoverStart} | Ends: ${fullHoverEnd}`}
              >
                {/* Task Title inside the bar */}
                <span className="truncate pr-3">
                  {idx + 1}. Task {task.title || task.taskName}
                </span>

                {/* Right side data inside the bar */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="opacity-90">{displayStart} - {displayEnd}</span>
                  {task.requiredDocuments?.length > 0 && (
                    <span className="rounded bg-black/25 px-1 py-0.5 text-[9px] leading-none" title={`${task.requiredDocuments.length} required documents`}>
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
  );
}
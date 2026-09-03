import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EntityPills from '../components/EntityPills';
import StatusBadge from '../components/StatusBadge';
import TaskActionModal from '../components/TaskActionModal';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { ENTITIES, getTasks, submitTask, approveTask, rejectTask, deleteTask } from '../services/api';

const PAGE_SIZE = 5;

export default function Inbox() {
  const [selected, setSelected] = useState(ENTITIES.map(e => e.id));
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [checkerPage, setCheckerPage] = useState(1);
  const [makerPage, setMakerPage] = useState(1);
  const [toastMsg, setToastMsg] = useState('');

  const session = getSession();
  const currentUser = session?.user;
  const rawName = currentUser?.name || '';
  const cleanName = rawName.split(' (')[0].trim().toLowerCase();
  const userRole = currentUser?.role || 'ADMIN';
  const isAdmin = userRole === 'ADMIN' || currentUser?.email?.includes('mainak');

  function isUserMatch(personName) {
    if (!personName) return false;
    const cleanPerson = personName.toLowerCase().trim();
    return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
  }

  async function loadTasks() {
    setLoading(true);
    const data = await getTasks(selected);
    if (data) {
      setTaskList(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, [selected]);

  async function handleSubmit(taskId, actorId, comment) {
    await submitTask(taskId, actorId, comment);
    setToastMsg('Task submitted for review!');
    setActiveTask(null);
    await loadTasks();
  }

  async function handleApprove(taskId, actorId, comment) {
    await approveTask(taskId, actorId, comment);
    setToastMsg('Task approved successfully!');
    setActiveTask(null);
    await loadTasks();
  }

  async function handleReject(taskId, actorId, comment) {
    await rejectTask(taskId, actorId, comment);
    setToastMsg('Task rejected and sent back to Maker.');
    setActiveTask(null);
    await loadTasks();
  }

  async function handleConfirmDeleteTask() {
    if (!deletingTask) return;
    try {
      setDeleting(true);
      await deleteTask(deletingTask.taskId || deletingTask.id || deletingTask.recordNo);
      setToastMsg(`Task "${deletingTask.recordNo || deletingTask.record}" deleted successfully!`);
      setDeletingTask(null);
      await loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const isMakerRole = userRole === 'MAKER' || userRole === 'MAKER_CHECKER' || userRole === 'CHECKER_MAKER' || userRole === 'CHECKER' || isAdmin;
  const isCheckerRole = userRole === 'CHECKER' || userRole === 'MAKER_CHECKER' || userRole === 'CHECKER_MAKER' || userRole === 'MAKER' || isAdmin;

  const showCheckerSection = isCheckerRole;
  const showMakerSection = isMakerRole;

  const checkerTasks = taskList.filter(t => {
    if (t.status !== 'PENDING_REVIEW') return false;
    if (isAdmin) return true;
    return isUserMatch(t.checker) || isUserMatch(t.assignedCheckers?.join(', ')) || isUserMatch(t.checkerName);
  });

  const makerTasks = taskList.filter(t => {
    if (t.status !== 'OPEN' && t.status !== 'REJECTED') return false;
    if (isAdmin) return true;
    return isUserMatch(t.maker) || isUserMatch(t.assignedMakers?.join(', ')) || isUserMatch(t.makerName);
  });

  const paginatedCheckerTasks = checkerTasks.slice((checkerPage - 1) * PAGE_SIZE, checkerPage * PAGE_SIZE);
  const paginatedMakerTasks = makerTasks.slice((makerPage - 1) * PAGE_SIZE, makerPage * PAGE_SIZE);

  return (

    <>

      <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
        <div className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
          <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
            <div>
              <h2 className="text-[22px] font-bold text-[#1e293b]">My Inbox</h2>
              <p className="text-[13.5px] text-text-muted mt-1">Action items assigned to you as Checker or Maker pool.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className="p-6 md:px-8 w-full max-w-full box-border">

          <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

          {/* Section 1: TASKS TO APPROVE (CHECKER) */}
          {showCheckerSection && (
            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Tasks to Approve (As Checker Pool)
                </span>
                <span className="text-[12px] font-semibold text-text-muted bg-[#f1f5f9] px-[10px] py-[3px] rounded-[12px]">
                  {checkerTasks.length} task{checkerTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">RECORD</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SOP</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PERIOD</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SUBMITTED BY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">DUE DATE</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={3} columns={8} />
                    ) : checkerTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-[#94a3b8] text-[13.5px]">
                          No pending approvals for selected entities.
                        </td>
                      </tr>
                    ) : (
                      paginatedCheckerTasks.map(task => {
                        const isActionedByOther = task.lockedChecker && !isUserMatch(task.lockedChecker) && userRole !== 'ADMIN';
                        const isSelfSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && userRole !== 'ADMIN';

                        return (
                          <tr key={task.id} className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]" onClick={() => setActiveTask(task)}>
                            <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{task.record}</td>
                            <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{task.sop}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.entity}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.period}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.maker}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.dueDate}</td>
                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                              <StatusBadge status={task.status} />
                            </td>
                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                              <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(22,163,74,0.1)] text-[#16a34a] transition-opacity duration-150 hover:opacity-85"
                                  onClick={() => setActiveTask(task)}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Review
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-[5px] px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(220,38,38,0.1)] text-[#dc2626] transition-opacity duration-150 hover:opacity-85"
                                    onClick={() => setDeletingTask(task)}
                                    title="Delete Task (Admin)"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && (
                <Pagination
                  currentPage={checkerPage}
                  totalItems={checkerTasks.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCheckerPage}
                  itemLabel="approval tasks"
                />
              )}
            </div>
          )}

          {/* Section 2: TASKS TO DO (MAKER) */}
          {showMakerSection && (
            <div className={`bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${showCheckerSection ? 'mt-6' : 'mt-0'}`}>
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Tasks to Complete (As Maker Pool)
                </span>
                <span className="text-[12px] font-semibold text-text-muted bg-[#f1f5f9] px-[10px] py-[3px] rounded-[12px]">
                  {makerTasks.length} task{makerTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">RECORD</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SOP</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PERIOD</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ASSIGNED CHECKERS</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">DUE DATE</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={3} columns={8} />
                    ) : makerTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-[#94a3b8] text-[13.5px]">
                          No tasks to complete for selected entities.
                        </td>
                      </tr>
                    ) : (
                      paginatedMakerTasks.map(task => {
                        const isLockedByOtherMaker = task.lockedMaker && !isUserMatch(task.lockedMaker) && userRole !== 'ADMIN';
                        return (
                          <tr key={task.id} className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]" onClick={() => setActiveTask(task)}>
                            <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{task.record}</td>
                            <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{task.sop}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.entity}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.period}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.checker}</td>
                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.dueDate}</td>
                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                              <StatusBadge status={task.status} />
                            </td>
                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                              <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(26,43,107,0.1)] text-[#1a2b6b] transition-opacity duration-150 hover:opacity-85"
                                  onClick={() => setActiveTask(task)}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Review
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-[5px] px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(220,38,38,0.1)] text-[#dc2626] transition-opacity duration-150 hover:opacity-85"
                                    onClick={() => setDeletingTask(task)}
                                    title="Delete Task (Admin)"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && (
                <Pagination
                  currentPage={makerPage}
                  totalItems={makerTasks.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setMakerPage}
                  itemLabel="tasks to complete"
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Task Details & Execution Modal */}
      <TaskActionModal
        isOpen={!!activeTask}
        task={activeTask}
        currentUser={currentUser}
        onClose={() => setActiveTask(null)}
        onSubmitTask={handleSubmit}
        onApproveTask={handleApprove}
        onRejectTask={handleReject}
      />

      {/* Confirmation Modal for Admin Task Deletion */}
      <ConfirmationModal
        isOpen={!!deletingTask}
        title="Delete Compliance Task"
        message={`Are you sure you want to delete task "${deletingTask?.record || deletingTask?.recordNo}" (${deletingTask?.sop})? This action cannot be undone.`}
        confirmText="Delete Task"
        confirmVariant="danger"
        submitting={deleting}
        onConfirm={handleConfirmDeleteTask}
        onClose={() => setDeletingTask(null)}
      />

    </>

  );
}

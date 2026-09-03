import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import CustomSelect from '../components/CustomSelect';
import AuditDateRangePicker from '../components/AuditDateRangePicker';
import EntityPills from '../components/EntityPills';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import TaskActionModal from '../components/TaskActionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { ENTITIES, getTasks, submitTask, approveTask, rejectTask, deleteTask } from '../services/api';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SOP_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All SOP Types' },
  { value: 'Tax Compliance', label: 'Tax Compliance' },
  { value: 'Treasury & Cash Management', label: 'Treasury & Cash Management' },
  { value: 'Financial Reporting', label: 'Financial Reporting' },
  { value: 'Fixed Assets', label: 'Fixed Assets' },
  { value: 'Payroll & Statutory', label: 'Payroll & Statutory' },
];

const MAKER_OPTIONS = [
  { value: 'ALL', label: 'All Makers' },
  { value: 'Tushar Seth', label: 'Tushar Seth' },
  { value: 'Vivek Raj', label: 'Vivek Raj' },
  { value: 'Prayasa Sharma', label: 'Prayasa Sharma' },
];

const CHECKER_OPTIONS = [
  { value: 'ALL', label: 'All Checkers' },
  { value: 'Mainak Gupta', label: 'Mainak Gupta' },
  { value: 'Vivek Raj', label: 'Vivek Raj' },
  { value: 'Manoj Agarwal', label: 'Manoj Agarwal' },
];

const PAGE_SIZE = 10;

export default function Tasks() {
  const [selected, setSelected] = useState(ENTITIES.map(e => e.id));
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTask, setActiveTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [dateRangeState, setDateRangeState] = useState({
    rangeType: 'ALL',
    startDate: '',
    endDate: '',
  });
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSopType, setSelectedSopType] = useState('ALL');
  const [selectedMaker, setSelectedMaker] = useState('ALL');
  const [selectedChecker, setSelectedChecker] = useState('ALL');

  const session = getSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');

  async function loadTasks() {
    setLoading(true);
    const data = await getTasks(selected, currentUser);
    if (data) {
      setTaskList(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();

    function handleOpenTaskEvent(e) {
      if (e.detail) {
        const tId = e.detail.taskId || e.detail.id;
        getTasks([]).then(all => {
          const found = (all || []).find(t => (t.taskId === tId || t.id === tId || t.recordNo === tId || t.record === tId));
          if (found) setActiveTask(found);
        });
      }
    }

    window.addEventListener('open-task-action', handleOpenTaskEvent);

    const params = new URLSearchParams(window.location.search);
    const openTaskId = params.get('openTaskId');
    if (openTaskId) {
      getTasks([]).then(all => {
        const target = (all || []).find(t => (t.taskId === openTaskId || t.id === openTaskId || t.recordNo === openTaskId || t.record === openTaskId));
        if (target) setActiveTask(target);
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('open-task-action', handleOpenTaskEvent);
    };
  }, [selected]);

  function resetFilters() {
    setDateRangeState({ rangeType: 'ALL', startDate: '', endDate: '' });
    setSelectedStatus('ALL');
    setSelectedSopType('ALL');
    setSelectedMaker('ALL');
    setSelectedChecker('ALL');
    setCurrentPage(1);
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

  async function handleModalSubmit(taskId, actorId, comment) {
    await submitTask(taskId, actorId, comment);
    setToastMsg('Task submitted for checker review!');
    setActiveTask(null);
    await loadTasks();
  }

  async function handleModalApprove(taskId, actorId, comment) {
    await approveTask(taskId, actorId, comment);
    setToastMsg('Task approved successfully!');
    setActiveTask(null);
    await loadTasks();
  }

  async function handleModalReject(taskId, actorId, comment) {
    await rejectTask(taskId, actorId, comment);
    setToastMsg('Task rejected and sent back to Maker.');
    setActiveTask(null);
    await loadTasks();
  }

  const filtered = taskList.filter(t => {
    // 1. Entity Filter
    if (!selected.includes(t.entityCode)) return false;

    // 2. Status Filter
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;

    // 3. SOP Type Filter
    if (selectedSopType !== 'ALL') {
      const sopTitle = (t.sop || t.sopTitle || t.processCategory || '').toLowerCase();
      if (selectedSopType === 'Tax Compliance' && !sopTitle.includes('tax') && !sopTitle.includes('gstr')) return false;
      if (selectedSopType === 'Payroll & Statutory' && !sopTitle.includes('payroll') && !sopTitle.includes('pf') && !sopTitle.includes('superannuation') && !sopTitle.includes('statutory')) return false;
      if (selectedSopType === 'Treasury & Cash Management' && !sopTitle.includes('treasury') && !sopTitle.includes('wire')) return false;
      if (selectedSopType === 'Financial Reporting' && !sopTitle.includes('reporting') && !sopTitle.includes('statutory filing') && !sopTitle.includes('house') && !sopTitle.includes('audit')) return false;
      if (selectedSopType === 'Fixed Assets' && !sopTitle.includes('asset') && !sopTitle.includes('fixed')) return false;
    }

    // 4. Maker Filter
    if (selectedMaker !== 'ALL') {
      const targetMaker = selectedMaker.toLowerCase();
      const matchMaker =
        (t.maker && t.maker.toLowerCase().includes(targetMaker)) ||
        (t.makerName && t.makerName.toLowerCase().includes(targetMaker)) ||
        (t.assignedMakers && t.assignedMakers.some(m => m.toLowerCase().includes(targetMaker)));
      if (!matchMaker) return false;
    }

    // 5. Checker Filter
    if (selectedChecker !== 'ALL') {
      const targetChecker = selectedChecker.toLowerCase();
      const matchChecker =
        (t.checker && t.checker.toLowerCase().includes(targetChecker)) ||
        (t.checkerName && t.checkerName.toLowerCase().includes(targetChecker)) ||
        (t.assignedCheckers && t.assignedCheckers.some(c => c.toLowerCase().includes(targetChecker)));
      if (!matchChecker) return false;
    }

    // 6. Date Range Filter
    const { rangeType, startDate, endDate } = dateRangeState;
    if (rangeType !== 'ALL' && t.dueDate && t.dueDate !== 'N/A') {
      const taskDate = new Date(t.dueDate + 'T00:00:00');
      const now = new Date(2026, 7, 28);

      if (rangeType === 'TODAY') {
        const todayStart = new Date(2026, 7, 28);
        todayStart.setHours(0, 0, 0, 0);
        if (taskDate < todayStart) return false;
      } else if (rangeType === 'LAST_7_DAYS') {
        if (now.getTime() - taskDate.getTime() > 7 * 24 * 3600 * 1000) return false;
      } else if (rangeType === 'THIS_WEEK') {
        const firstDayOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);
        if (taskDate < firstDayOfWeek) return false;
      } else if (rangeType === 'THIS_MONTH') {
        if (taskDate.getFullYear() !== now.getFullYear() || taskDate.getMonth() !== now.getMonth()) return false;
      } else if (rangeType === 'THIS_QUARTER') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const taskQuarter = Math.floor(taskDate.getMonth() / 3);
        if (taskDate.getFullYear() !== now.getFullYear() || taskQuarter !== currentQuarter) return false;
      } else if (rangeType === 'CUSTOM') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (taskDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (taskDate > end) return false;
        }
      }
    }

    return true;
  });

  const paginatedTasks = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isFiltered = dateRangeState.rangeType !== 'ALL' || selectedStatus !== 'ALL' || selectedSopType !== 'ALL' || selectedMaker !== 'ALL' || selectedChecker !== 'ALL';

  return (
    <>
      <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
        <div className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
          <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
            <div>
              <h2 className="text-[22px] font-bold text-[#1e293b]">Task List</h2>
              <p className="text-[13.5px] text-text-muted mt-1">Compliance tasks assigned to your Maker/Checker pool.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className="p-6 md:px-8 w-full max-w-full box-border">
          <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

          {/* Structured Filter Toolbar */}
          <div className="flex flex-wrap items-end gap-4 mb-6 bg-bg-surface p-[18px_20px] rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-1.5 flex-[1.5] min-w-[220px]">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Due Date Range</span>
              <AuditDateRangePicker
                rangeType={dateRangeState.rangeType}
                startDate={dateRangeState.startDate}
                endDate={dateRangeState.endDate}
                onChange={setDateRangeState}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">SOP Type</span>
              <CustomSelect
                name="selectedSopType"
                value={selectedSopType}
                options={SOP_TYPE_OPTIONS}
                onChange={e => {
                  setSelectedSopType(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Status</span>
              <CustomSelect
                name="selectedStatus"
                value={selectedStatus}
                options={STATUS_OPTIONS}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Maker</span>
              <CustomSelect
                name="selectedMaker"
                value={selectedMaker}
                options={MAKER_OPTIONS}
                onChange={e => {
                  setSelectedMaker(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Checker</span>
              <CustomSelect
                name="selectedChecker"
                value={selectedChecker}
                options={CHECKER_OPTIONS}
                onChange={e => {
                  setSelectedChecker(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {isFiltered && (
              <button
                type="button"
                className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#475569] text-[12.5px] font-semibold px-4 h-[40px] rounded-[8px] cursor-pointer transition-all duration-150 ease-in-out whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                onClick={resetFilters}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset
              </button>
            )}
          </div>

          <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">RECORD</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SOP</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PERIOD</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">MAKER(S)</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">CHECKER(S)</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">DUE DATE</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={5} columns={9} />
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-12 text-[#94a3b8] text-[13.5px]">
                        No assigned tasks match your selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map(task => (
                      <tr
                        key={task.taskId || task.id || task.recordNo}
                        className="cursor-pointer group border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                        onClick={() => setActiveTask(task)}
                      >
                        <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{task.recordNo || task.record}</td>
                        <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{task.sopTitle || task.sop}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.entityName || task.entity}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.periodKey || task.period}</td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          <span className="font-medium text-[#1e293b]">
                            {task.assignedMakers && task.assignedMakers.length > 0
                              ? task.assignedMakers.join(', ')
                              : (task.makerName || task.maker)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          <span className="font-medium text-[#1e293b]">
                            {task.assignedCheckers && task.assignedCheckers.length > 0
                              ? task.assignedCheckers.join(', ')
                              : (task.checkerName || task.checker)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.dueDate}</td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle"><StatusBadge status={task.status} /></td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              title="View & Review Task"
                              className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] rounded-[6px] px-[10px] py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1 hover:opacity-85 transition-opacity duration-150"
                              onClick={() => setActiveTask(task)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              View
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                title="Delete Task (Admin)"
                                className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] rounded-[6px] px-[10px] py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1 hover:opacity-85 transition-opacity duration-150"
                                onClick={() => setDeletingTask(task)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="tasks"
              />
            )}
          </div>
        </div>
      </main>

      {/* Task Action Modal */}
      <TaskActionModal
        isOpen={!!activeTask}
        task={activeTask}
        currentUser={currentUser}
        onClose={() => setActiveTask(null)}
        onSubmitTask={handleModalSubmit}
        onApproveTask={handleModalApprove}
        onRejectTask={handleModalReject}
      />

      {/* Confirmation Modal for Admin Task Deletion */}
      <ConfirmationModal
        isOpen={!!deletingTask}
        title="Delete Compliance Task"
        message={`Are you sure you want to delete compliance task "${deletingTask?.recordNo || deletingTask?.record}" (${deletingTask?.sopTitle || deletingTask?.sop})? This action cannot be undone.`}
        confirmText="Delete Task"
        confirmVariant="danger"
        submitting={deleting}
        onConfirm={handleConfirmDeleteTask}
        onClose={() => setDeletingTask(null)}
      />

    </>

  );
}

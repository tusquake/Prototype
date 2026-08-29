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
import styles from './Tasks.module.css';

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
    const data = await getTasks(selected);
    if (data) {
      setTaskList(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
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
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>Task List</h2>
              <p>Compliance tasks assigned to your Maker/Checker pool.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className={styles.page}>

          <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

          {/* Structured Filter Toolbar */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup} style={{ flex: 1.5, minWidth: 220 }}>
              <span className={styles.filterLabel}>Due Date Range</span>
              <AuditDateRangePicker
                rangeType={dateRangeState.rangeType}
                startDate={dateRangeState.startDate}
                endDate={dateRangeState.endDate}
                onChange={setDateRangeState}
              />
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>SOP Type</span>
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

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status</span>
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

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Maker</span>
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

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Checker</span>
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
              <button className={styles.resetBtn} onClick={resetFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset
              </button>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>RECORD</th>
                    <th>SOP</th>
                    <th>ENTITY</th>
                    <th>PERIOD</th>
                    <th>MAKER(S)</th>
                    <th>CHECKER(S)</th>
                    <th>DUE DATE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={5} columns={9} />
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={styles.empty}>
                        No assigned tasks match your selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map(task => (
                      <tr key={task.taskId || task.id || task.recordNo} style={{ cursor: 'pointer' }} onClick={() => setActiveTask(task)}>
                        <td className={styles.tdCode}>{task.recordNo || task.record}</td>
                        <td className={styles.tdName}>{task.sopTitle || task.sop}</td>
                        <td>{task.entityName || task.entity}</td>
                        <td>{task.periodKey || task.period}</td>
                        <td>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {task.assignedMakers && task.assignedMakers.length > 0
                              ? task.assignedMakers.join(', ')
                              : (task.makerName || task.maker)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {task.assignedCheckers && task.assignedCheckers.length > 0
                              ? task.assignedCheckers.join(', ')
                              : (task.checkerName || task.checker)}
                          </span>
                        </td>
                        <td>{task.dueDate}</td>
                        <td><StatusBadge status={task.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              title="View & Review Task"
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
    </div>
  );
}

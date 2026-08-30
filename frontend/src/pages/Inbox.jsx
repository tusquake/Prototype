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
import styles from './Inbox.module.css';

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
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>My Inbox</h2>
              <p>Action items assigned to you as Checker or Maker pool.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className={styles.page}>

          <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

          {/* Section 1: TASKS TO APPROVE (CHECKER) */}
          {showCheckerSection && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Tasks to Approve (As Checker Pool)
                </span>
                <span className={styles.sectionCount}>
                  {checkerTasks.length} task{checkerTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>RECORD</th>
                      <th>SOP</th>
                      <th>ENTITY</th>
                      <th>PERIOD</th>
                      <th>SUBMITTED BY</th>
                      <th>DUE DATE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={3} columns={8} />
                    ) : checkerTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.empty}>
                          No pending approvals for selected entities.
                        </td>
                      </tr>
                    ) : (
                      paginatedCheckerTasks.map(task => {
                        const isActionedByOther = task.lockedChecker && !isUserMatch(task.lockedChecker) && userRole !== 'ADMIN';
                        const isSelfSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && userRole !== 'ADMIN';

                        return (
                          <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setActiveTask(task)}>
                            <td className={styles.tdCode}>{task.record}</td>
                            <td className={styles.tdName}>{task.sop}</td>
                            <td>{task.entity}</td>
                            <td>{task.period}</td>
                            <td>{task.maker}</td>
                            <td>{task.dueDate}</td>
                            <td>
                              <StatusBadge status={task.status} />
                            </td>
                            <td>
                              <div className={styles.actionGroup} onClick={e => e.stopPropagation()}>
                                <button
                                  className={`${styles.actionBtn} ${styles.approve}`}
                                  onClick={() => setActiveTask(task)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Review
                                </button>

                                {isAdmin && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.reject}`}
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
            <div className={styles.section} style={{ marginTop: showCheckerSection ? 24 : 0 }}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Tasks to Complete (As Maker Pool)
                </span>
                <span className={styles.sectionCount}>
                  {makerTasks.length} task{makerTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>RECORD</th>
                      <th>SOP</th>
                      <th>ENTITY</th>
                      <th>PERIOD</th>
                      <th>ASSIGNED CHECKERS</th>
                      <th>DUE DATE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={3} columns={8} />
                    ) : makerTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.empty}>
                          No tasks to complete for selected entities.
                        </td>
                      </tr>
                    ) : (
                      paginatedMakerTasks.map(task => {
                        const isLockedByOtherMaker = task.lockedMaker && !isUserMatch(task.lockedMaker) && userRole !== 'ADMIN';
                        return (
                          <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setActiveTask(task)}>
                            <td className={styles.tdCode}>{task.record}</td>
                            <td className={styles.tdName}>{task.sop}</td>
                            <td>{task.entity}</td>
                            <td>{task.period}</td>
                            <td>{task.checker}</td>
                            <td>{task.dueDate}</td>
                            <td>
                              <StatusBadge status={task.status} />
                            </td>
                            <td>
                              <div className={styles.actionGroup} onClick={e => e.stopPropagation()}>
                                <button
                                  className={`${styles.actionBtn} ${styles.submit}`}
                                  onClick={() => setActiveTask(task)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Review
                                </button>

                                {isAdmin && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.reject}`}
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CustomSelect from '../components/CustomSelect';
import AuditDateRangePicker from '../components/AuditDateRangePicker';
import EntityPills from '../components/EntityPills';
import TableSkeleton from '../components/TableSkeleton';
import AuditDetailModal from '../components/AuditDetailModal';
import Pagination from '../components/Pagination';
import { getAuditLogs, ENTITIES } from '../services/api';
import styles from './AuditLogs.module.css';

const LOG_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Log Types' },
  { value: 'SUBMIT_TASK', label: 'Submit Task' },
  { value: 'APPROVE_TASK', label: 'Approve Task' },
  { value: 'REJECT_TASK', label: 'Reject Task' },
  { value: 'CREATE_SOP', label: 'Create SOP' },
  { value: 'UPDATE_SOP', label: 'Update SOP' },
  { value: 'DELETE_SOP', label: 'Delete SOP' },
  { value: 'CREATE_TASK', label: 'Create Task' },
  { value: 'DELETE_TASK', label: 'Delete Task' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Component Types' },
  { value: 'TASK', label: 'Task Records' },
  { value: 'SOP', label: 'SOP Master Definitions' },
];

const ACTOR_OPTIONS = [
  { value: 'ALL', label: 'All User Actors' },
  { value: 'Manoj Agarwal', label: 'Manoj Agarwal' },
  { value: 'Vivek Raj', label: 'Vivek Raj' },
  { value: 'Mainak Gupta', label: 'Mainak Gupta' },
  { value: 'Tushar Seth', label: 'Tushar Seth' },
  { value: 'Prayasa Sharma', label: 'Prayasa Sharma' },
];

const PAGE_SIZE = 10;

export function formatActionLabel(action) {
  if (!action) return '';
  const map = {
    'SUBMIT_TASK': 'Submit Task',
    'SUBMIT': 'Submit Task',
    'APPROVE_TASK': 'Approve Task',
    'APPROVE': 'Approve Task',
    'REJECT_TASK': 'Reject Task',
    'REJECT': 'Reject Task',
    'CREATE_SOP': 'Create SOP',
    'UPDATE_SOP': 'Update SOP',
    'DELETE_SOP': 'Delete SOP',
    'CREATE_TASK': 'Create Task',
    'DELETE_TASK': 'Delete Task',
  };
  if (map[action]) return map[action];
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditLogs() {
  const [selectedEntities, setSelectedEntities] = useState(ENTITIES.map(e => e.id));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangeState, setDateRangeState] = useState({
    rangeType: 'ALL',
    startDate: '',
    endDate: '',
  });
  const [actionType, setActionType] = useState('ALL');
  const [entityType, setEntityType] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [activeLog, setActiveLog] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      const data = await getAuditLogs();
      if (data) {
        setLogs(data);
      }
      setLoading(false);
    }
    loadLogs();
  }, []);

  function toggleEntity(id) {
    setSelectedEntities(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }

  function resetFilters() {
    setDateRangeState({ rangeType: 'ALL', startDate: '', endDate: '' });
    setActionType('ALL');
    setEntityType('ALL');
    setActorFilter('ALL');
  }

  const filteredLogs = logs.filter(log => {
    // 1. Date Range Filter
    const { rangeType, startDate, endDate } = dateRangeState;
    if (rangeType !== 'ALL') {
      const logDate = new Date(log.timestamp);
      const now = new Date(2026, 7, 28);

      if (rangeType === 'TODAY') {
        const todayStart = new Date(2026, 7, 28);
        todayStart.setHours(0, 0, 0, 0);
        if (logDate < todayStart) return false;
      } else if (rangeType === 'LAST_7_DAYS') {
        if (now.getTime() - logDate.getTime() > 7 * 24 * 3600 * 1000) return false;
      } else if (rangeType === 'THIS_WEEK') {
        const firstDayOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);
        if (logDate < firstDayOfWeek) return false;
      } else if (rangeType === 'THIS_MONTH') {
        if (logDate.getFullYear() !== now.getFullYear() || logDate.getMonth() !== now.getMonth()) return false;
      } else if (rangeType === 'THIS_QUARTER') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const logQuarter = Math.floor(logDate.getMonth() / 3);
        if (logDate.getFullYear() !== now.getFullYear() || logQuarter !== currentQuarter) return false;
      } else if (rangeType === 'CUSTOM') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (logDate > end) return false;
        }
      }
    }

    // 2. Log Type / Action Filter
    if (actionType !== 'ALL' && log.action !== actionType) {
      return false;
    }

    // 3. Entity Type Filter
    if (entityType !== 'ALL' && log.entityType !== entityType) {
      return false;
    }

    // 4. Actor Filter
    if (actorFilter !== 'ALL') {
      const actorName = log.actorName || log.actorId || '';
      if (!actorName.toLowerCase().includes(actorFilter.toLowerCase())) return false;
    }

    return true;
  });

  function renderActionBadge(action) {
    const act = (action || '').toUpperCase();
    const label = formatActionLabel(action);

    if (act.includes('SUBMIT')) {
      return (
        <span className={`${styles.actionBadge} ${styles.actionSubmit}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          {label}
        </span>
      );
    }
    if (act.includes('APPROVE')) {
      return (
        <span className={`${styles.actionBadge} ${styles.actionApprove}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {label}
        </span>
      );
    }
    if (act.includes('REJECT')) {
      return (
        <span className={`${styles.actionBadge} ${styles.actionReject}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {label}
        </span>
      );
    }
    return (
      <span className={`${styles.actionBadge} ${styles.actionCreate}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="16" y2="12" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        {label}
      </span>
    );
  }

  function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    try {
      const date = new Date(ts);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return ts;
    }
  }

  const isFiltered = dateRangeState.rangeType !== 'ALL' || actionType !== 'ALL' || entityType !== 'ALL' || actorFilter !== 'ALL';

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>Audit Trail</h2>
              <p>Immutable event log of all Maker/Checker actions for compliance & security verification.</p>
            </div>
            <EntityPills selectedEntities={selectedEntities} onChange={setSelectedEntities} />
          </div>
        </div>

        <div className={styles.page}>

          {/* Structured Filter Toolbar */}
          <div className={styles.filterRow}>
            {/* Unified Date Range Picker */}
            <div className={styles.filterGroup} style={{ flex: 1.5, minWidth: 220 }}>
              <span className={styles.filterLabel}>Time Range</span>
              <AuditDateRangePicker
                rangeType={dateRangeState.rangeType}
                startDate={dateRangeState.startDate}
                endDate={dateRangeState.endDate}
                onChange={setDateRangeState}
              />
            </div>

            {/* Action Filter */}
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Action</span>
              <CustomSelect
                name="actionType"
                value={actionType}
                options={LOG_TYPE_OPTIONS}
                onChange={e => {
                  setActionType(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Entity Type Filter */}
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Entity Type</span>
              <CustomSelect
                name="entityType"
                value={entityType}
                options={ENTITY_TYPE_OPTIONS}
                onChange={e => {
                  setEntityType(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* User / Actor Filter */}
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>User</span>
              <CustomSelect
                name="actorFilter"
                value={actorFilter}
                options={ACTOR_OPTIONS}
                onChange={e => {
                  setActorFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Reset Filters */}
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
                    <th>TIMESTAMP</th>
                    <th>USER / ACTOR</th>
                    <th>ACTION</th>
                    <th>ENTITY TYPE</th>
                    <th>RECORD / ENTITY ID</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={5} columns={5} />
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        No audit records match your selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map(log => (
                      <tr key={log.auditId} style={{ cursor: 'pointer' }} onClick={() => setActiveLog(log)}>
                        <td style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td>
                          <div className={styles.actorCell}>
                            <span className={styles.actorName}>{log.actorName || log.actorId}</span>
                            <span className={styles.actorEmail}>{log.actorEmail || log.actorId}</span>
                          </div>
                        </td>
                        <td>{renderActionBadge(log.action)}</td>
                        <td>
                          <span className={styles.entityBadge}>{log.entityType}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#091124' }}>
                          {log.entityId}
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
                totalItems={filteredLogs.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="audit records"
              />
            )}
          </div>
        </div>
      </main>

      {/* Audit Record Detail Modal (Strict Read-Only) */}
      <AuditDetailModal
        isOpen={!!activeLog}
        log={activeLog}
        onClose={() => setActiveLog(null)}
      />
    </div>
  );
}

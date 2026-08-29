import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EntityPills from '../components/EntityPills';
import StatusBadge from '../components/StatusBadge';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import { getSession } from '../auth/auth';
import { ENTITIES, getDashboardSummary } from '../services/api';
import styles from './Dashboard.module.css';

const PAGE_SIZE = 5;

export default function Dashboard() {
  const [selected, setSelected] = useState(ENTITIES.map(e => e.id));
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const session = getSession();
  const currentUser = session?.user;

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      const data = await getDashboardSummary(selected, currentUser);
      if (data) {
        setSummaryData(data);
      }
      setLoading(false);
    }
    loadSummary();
  }, [selected, currentUser?.email]);

  function toggleEntity(id) {
    setSelected(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }

  const trackedTasks = summaryData?.metrics?.trackedTasks ?? 0;
  const approvedThisCycle = summaryData?.metrics?.approvedThisCycle ?? 0;
  const pendingReview = summaryData?.metrics?.pendingReview ?? 0;
  const overdue = summaryData?.metrics?.overdue ?? 0;

  const scorecard = summaryData?.scorecard ?? [];
  const overdueList = summaryData?.overdueList ?? [];
  const paginatedOverdue = overdueList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>Overview</h2>
              <p>Compliance monitoring across CK India, US, UK and Australia.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className={styles.page}>

          {/* Metrics Grid */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <div className={`${styles.metricValue} ${styles.valPrimary}`}>
                  {loading ? <span className="shimmer" style={{ width: 48, height: 32 }} /> : trackedTasks}
                </div>
                <div className={styles.metricIconWrap} style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 12h6" />
                    <path d="M9 16h6" />
                  </svg>
                </div>
              </div>
              <div className={styles.metricLabel}>Tracked tasks</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <div className={`${styles.metricValue} ${styles.valSuccess}`}>
                  {loading ? <span className="shimmer" style={{ width: 48, height: 32 }} /> : approvedThisCycle}
                </div>
                <div className={styles.metricIconWrap} style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <div className={styles.metricLabel}>Approved this cycle</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <div className={`${styles.metricValue} ${styles.valWarning}`}>
                  {loading ? <span className="shimmer" style={{ width: 48, height: 32 }} /> : pendingReview}
                </div>
                <div className={styles.metricIconWrap} style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <div className={styles.metricLabel}>Pending checker review</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <div className={`${styles.metricValue} ${styles.valDanger}`}>
                  {loading ? <span className="shimmer" style={{ width: 48, height: 32 }} /> : overdue}
                </div>
                <div className={styles.metricIconWrap} style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              </div>
              <div className={styles.metricLabel}>Overdue</div>
            </div>
          </div>

          {/* Compliance Scorecard */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Compliance Scorecard by Entity
              </span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ENTITY</th>
                    <th>TOTAL TASKS</th>
                    <th>OVERDUE</th>
                    <th>ON-TIME RATE</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={4} columns={4} />
                  ) : scorecard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>
                        No entities selected or no task data available.
                      </td>
                    </tr>
                  ) : (
                    scorecard.map(row => (
                      <tr key={row.entityId}>
                        <td className={styles.tdName}>{row.entity}</td>
                        <td>{row.totalTasks}</td>
                        <td style={{ color: row.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          {row.overdue}
                        </td>
                        <td style={{ color: row.onTimeRate === '0%' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {row.onTimeRate}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Watchlist */}
          <div className={styles.section} style={{ marginTop: 24 }}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Overdue Watchlist
              </span>
              {overdueList.length > 0 && (
                <span className={styles.sectionCount}>{overdueList.length} items</span>
              )}
            </div>
            <div className={styles.tableWrap}>
              {loading ? (
                <table className={styles.table}>
                  <tbody>
                    <TableSkeleton rows={2} columns={7} />
                  </tbody>
                </table>
              ) : overdueList.length === 0 ? (
                <div className={styles.emptyWatchlist}>
                  Nothing overdue for the selected entities.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>RECORD</th>
                      <th>SOP</th>
                      <th>ENTITY</th>
                      <th>MAKER</th>
                      <th>DUE DATE</th>
                      <th>DAYS OVERDUE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOverdue.map(item => (
                      <tr key={item.id}>
                        <td className={styles.tdCode}>{item.record}</td>
                        <td className={styles.tdName}>{item.sop}</td>
                        <td>{item.entity}</td>
                        <td>{item.maker}</td>
                        <td>{item.dueDate}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {item.daysOverdue}d
                        </td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalItems={overdueList.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="overdue tasks"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

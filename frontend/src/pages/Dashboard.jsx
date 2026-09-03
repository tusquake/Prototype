import { useState, useEffect } from 'react';
import EntityPills from '../components/EntityPills';
import StatusBadge from '../components/StatusBadge';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import { getSession } from '../auth/auth';
import { ENTITIES, getDashboardSummary } from '../services/api';

const PAGE_SIZE = 5;

function MetricCard({ loading, value, label, valueColorClass, iconBgClass, iconColorClass, icon }) {
  return (
    <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[115px]">
      <div className="flex items-start justify-between">
        <div className={`text-[32px] font-bold leading-[1.1] mb-2 ${valueColorClass}`}>
          {loading ? <span className="shimmer inline-block w-[48px] h-[32px] rounded-[6px]" /> : value}
        </div>
        <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${iconBgClass} ${iconColorClass}`}>
          {icon}
        </div>
      </div>
      <div className="text-[13px] font-medium text-text-muted">{label}</div>
    </div>
  );
}

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
    <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
      <header className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
        <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
          <div>
            <h2 className="text-[22px] font-bold text-[#1e293b]">Overview</h2>
            <p className="text-[13.5px] text-text-muted mt-1">
              Compliance monitoring across CK India, US, UK and Australia.
            </p>
          </div>
          <EntityPills selectedEntities={selected} onChange={setSelected} />
        </div>
      </header>

      <div className="p-6 md:px-8 w-full max-w-full box-border">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-[28px]">
          <MetricCard
            loading={loading}
            value={trackedTasks}
            label="Tracked tasks"
            valueColorClass="text-[#0284c7]"
            iconBgClass="bg-[rgba(2,132,199,0.1)]"
            iconColorClass="text-[#0284c7]"
            icon={(
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
            )}
          />

          <MetricCard
            loading={loading}
            value={approvedThisCycle}
            label="Approved this cycle"
            valueColorClass="text-[#059669]"
            iconBgClass="bg-[rgba(5,150,105,0.1)]"
            iconColorClass="text-[#059669]"
            icon={(
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
          />

          <MetricCard
            loading={loading}
            value={pendingReview}
            label="Pending checker review"
            valueColorClass="text-[#2563eb]"
            iconBgClass="bg-[rgba(37,99,235,0.1)]"
            iconColorClass="text-[#2563eb]"
            icon={(
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          />

          <MetricCard
            loading={loading}
            value={overdue}
            label="Overdue"
            valueColorClass="text-[#dc2626]"
            iconBgClass="bg-[rgba(220,38,38,0.1)]"
            iconColorClass="text-[#dc2626]"
            icon={(
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          />
        </div>

        {/* Compliance Scorecard */}
        <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Compliance Scorecard by Entity
            </span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">TOTAL TASKS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">OVERDUE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ON-TIME RATE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={4} columns={4} />
                ) : scorecard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-12 text-[#94a3b8] text-[13.5px]">
                      No entities selected or no task data available.
                    </td>
                  </tr>
                ) : (
                  scorecard.map(row => (
                    <tr key={row.entityId} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                      <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{row.entity}</td>
                      <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{row.totalTasks}</td>
                      <td className={`px-6 py-3.5 text-[13.5px] align-middle ${row.overdue > 0 ? 'text-[#dc2626]' : 'text-text-secondary'}`}>
                        {row.overdue}
                      </td>
                      <td className={`px-6 py-3.5 text-[13.5px] font-semibold align-middle ${row.onTimeRate === '0%' ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
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
        <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] mt-6">
          <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              Overdue Watchlist
            </span>
            {overdueList.length > 0 && (
              <span className="text-[12px] font-semibold text-text-muted bg-[#f1f5f9] px-[10px] py-[3px] rounded-[12px]">
                {overdueList.length} items
              </span>
            )}
          </div>
          <div className="overflow-x-auto w-full">
            {loading ? (
              <table className="w-full border-collapse">
                <tbody>
                  <TableSkeleton rows={2} columns={7} />
                </tbody>
              </table>
            ) : overdueList.length === 0 ? (
              <div className="text-center py-[56px] px-6 text-[#94a3b8] text-[13.5px] font-medium">
                Nothing overdue for the selected entities.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">RECORD</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SOP</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">MAKER</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">DUE DATE</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">DAYS OVERDUE</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOverdue.map(item => (
                    <tr key={item.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                      <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{item.record}</td>
                      <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{item.sop}</td>
                      <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{item.entity}</td>
                      <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{item.maker}</td>
                      <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{item.dueDate}</td>
                      <td className="px-6 py-3.5 text-[13.5px] text-[#dc2626] font-semibold align-middle">
                        {item.daysOverdue}d
                      </td>
                      <td className="px-6 py-3.5 text-[13.5px] align-middle"><StatusBadge status={item.status} /></td>
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

  );
}

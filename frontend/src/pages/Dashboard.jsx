import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import { getSession } from '../auth/auth';
import { getDashboardSummary, getSopProgress } from '../services/api';
import { useEntity } from '../context/EntityContext';

const PAGE_SIZE = 5;

// ──────────────────────────────────────────────────────────────────────────────
// Task-level KPI Cards
// ──────────────────────────────────────────────────────────────────────────────
const METRICS_ARR = [
  {
    id: 'trackedTasks',
    title: 'Tracked Tasks',
    valueColorClass: 'text-[#0284c7]',
    iconBgClass: 'bg-[rgba(2,132,199,0.1)]',
    iconColorClass: 'text-[#0284c7]',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 12h6" /><path d="M9 16h6" />
      </svg>
    ),
  },
  {
    id: 'approvedThisCycle',
    title: 'Approved this Cycle',
    valueColorClass: 'text-[#059669]',
    iconBgClass: 'bg-[rgba(5,150,105,0.1)]',
    iconColorClass: 'text-[#059669]',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    id: 'pendingReview',
    title: 'Pending Checker Review',
    valueColorClass: 'text-[#2563eb]',
    iconBgClass: 'bg-[rgba(37,99,235,0.1)]',
    iconColorClass: 'text-[#2563eb]',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'overdue',
    title: 'Overdue',
    valueColorClass: 'text-[#dc2626]',
    iconBgClass: 'bg-[rgba(220,38,38,0.1)]',
    iconColorClass: 'text-[#dc2626]',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

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

// ──────────────────────────────────────────────────────────────────────────────
// SOP status colour mapping
// ──────────────────────────────────────────────────────────────────────────────
function sopStatusChip(status) {
  const map = {
    ACTIVE: { bg: 'bg-[rgba(5,150,105,0.1)]', text: 'text-[#059669]', label: 'Active' },
    IN_PROGRESS: { bg: 'bg-[rgba(37,99,235,0.1)]', text: 'text-[#2563eb]', label: 'In Progress' },
    COMPLETED: { bg: 'bg-[rgba(100,116,139,0.1)]', text: 'text-[#64748b]', label: 'Completed' },
    OVERDUE: { bg: 'bg-[rgba(220,38,38,0.1)]', text: 'text-[#dc2626]', label: 'Overdue' },
  };
  const cfg = map[status] || { bg: 'bg-[rgba(100,116,139,0.1)]', text: 'text-[#64748b]', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Horizontal progress bar
// ──────────────────────────────────────────────────────────────────────────────
function ProgressBar({ pct, overdue }) {
  const color = overdue > 0 ? '#dc2626' : pct >= 80 ? '#059669' : pct >= 40 ? '#2563eb' : '#f59e0b';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }}
          className="h-full rounded-full"
        />
      </div>
      <span className="text-[12px] font-semibold w-[34px] text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SOP Timeline Bar Chart
// ──────────────────────────────────────────────────────────────────────────────
function SopBarChart({ sopList }) {
  // show top 8 by overdue then name
  const items = [...sopList].slice(0, 8);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 py-2">
      {items.map((sop) => {
        const pct = sop.progressPercent ?? 0;
        const hasOverdue = sop.overdueTasks > 0;
        const barColor = hasOverdue ? '#dc2626' : pct >= 80 ? '#059669' : pct >= 40 ? '#2563eb' : '#f59e0b';
        const pendingPct = sop.totalTasks > 0
          ? Math.round((sop.pendingTasks / sop.totalTasks) * 100)
          : 0;
        const overduePct = sop.totalTasks > 0
          ? Math.round((sop.overdueTasks / sop.totalTasks) * 100)
          : 0;
        const donePct = pct;
        return (
          <div key={sop.sopId} className="flex items-center gap-3">
            <div className="w-[180px] shrink-0 truncate text-[12px] font-medium text-[#334155]" title={sop.title}>
              {sop.sopCode || sop.title}
            </div>
            <div className="flex-1 flex h-[22px] rounded-[5px] overflow-hidden bg-[#f1f5f9]">
              {donePct > 0 && (
                <div
                  style={{ width: `${donePct}%`, background: '#059669' }}
                  title={`Completed: ${sop.completedTasks}`}
                  className="h-full"
                />
              )}
              {pendingPct > 0 && (
                <div
                  style={{ width: `${pendingPct}%`, background: '#93c5fd' }}
                  title={`Pending: ${sop.pendingTasks}`}
                  className="h-full"
                />
              )}
              {overduePct > 0 && (
                <div
                  style={{ width: `${overduePct}%`, background: '#fca5a5' }}
                  title={`Overdue: ${sop.overdueTasks}`}
                  className="h-full"
                />
              )}
            </div>
            <div className="w-[80px] shrink-0 text-right">
              <span className="text-[12px] font-bold" style={{ color: barColor }}>{donePct}%</span>
              <span className="text-[11px] text-[#94a3b8] ml-1">
                ({sop.completedTasks}/{sop.totalTasks})
              </span>
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#f1f5f9]">
        <span className="flex items-center gap-1 text-[11px] text-[#64748b]">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#059669]" /> Completed
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#64748b]">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#93c5fd]" /> Pending
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#64748b]">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#fca5a5]" /> Overdue
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
const TABS = ['Task Overview', 'SOP Overview'];

export default function Dashboard() {
  const [summaryData, setSummaryData] = useState(null);
  const [sopProgressData, setSopProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sopLoading, setSopLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('Task Overview');
  const [sopPage, setSopPage] = useState(1);

  const { selectedEntities } = useEntity();
  const session = getSession();
  const currentUser = session?.user;

  // Load task dashboard summary
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      const data = await getDashboardSummary(selectedEntities, currentUser);
      if (data) setSummaryData(data);
      setLoading(false);
    }
    loadSummary();
  }, [selectedEntities, currentUser?.email]);

  // Load SOP progress data
  useEffect(() => {
    async function loadSopProgress() {
      setSopLoading(true);
      const data = await getSopProgress(selectedEntities);
      setSopProgressData(Array.isArray(data) ? data : []);
      setSopLoading(false);
    }
    loadSopProgress();
  }, [selectedEntities]);

  // Task metrics
  const trackedTasks = summaryData?.metrics?.trackedTasks ?? 0;
  const approvedThisCycle = summaryData?.metrics?.approvedThisCycle ?? 0;
  const pendingReview = summaryData?.metrics?.pendingReview ?? 0;
  const overdue = summaryData?.metrics?.overdue ?? 0;
  const scorecard = summaryData?.scorecard ?? [];
  const overdueList = summaryData?.overdueList ?? [];
  const paginatedOverdue = overdueList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // SOP metrics
  const totalSops = sopProgressData.length;
  const activeSops = sopProgressData.filter(s => s.status === 'ACTIVE' || s.status === 'IN_PROGRESS').length;
  const completedSops = sopProgressData.filter(s => s.status === 'COMPLETED').length;
  const overdueSops = sopProgressData.filter(s => s.overdueTasks > 0).length;
  const paginatedSops = sopProgressData.slice((sopPage - 1) * PAGE_SIZE, sopPage * PAGE_SIZE);

  const SOP_KPI = [
    {
      label: 'Total SOPs', value: totalSops,
      valueColorClass: 'text-[#0284c7]',
      iconBgClass: 'bg-[rgba(2,132,199,0.1)]', iconColorClass: 'text-[#0284c7]',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    },
    {
      label: 'Active / In-Progress', value: activeSops,
      valueColorClass: 'text-[#2563eb]',
      iconBgClass: 'bg-[rgba(37,99,235,0.1)]', iconColorClass: 'text-[#2563eb]',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      label: 'Completed', value: completedSops,
      valueColorClass: 'text-[#059669]',
      iconBgClass: 'bg-[rgba(5,150,105,0.1)]', iconColorClass: 'text-[#059669]',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    {
      label: 'With Overdue Tasks', value: overdueSops,
      valueColorClass: 'text-[#dc2626]',
      iconBgClass: 'bg-[rgba(220,38,38,0.1)]', iconColorClass: 'text-[#dc2626]',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    },
  ];

  return (
    <>
      <div className="p-6 md:px-8 w-full max-w-full box-border">

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 mb-6 border-b border-[#e2e8f0]">
          {TABS.map(tab => (
            <button
              key={tab}
              id={`tab-${tab.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-[13.5px] font-semibold rounded-t-[8px] transition-all border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#2563eb] text-[#2563eb] bg-[#eff6ff]'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TASK OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'Task Overview' && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-[28px]">
              {METRICS_ARR.map((metric) => {
                const value =
                  metric.id === 'trackedTasks' ? trackedTasks
                    : metric.id === 'approvedThisCycle' ? approvedThisCycle
                    : metric.id === 'pendingReview' ? pendingReview
                    : overdue;
                return (
                  <MetricCard
                    key={metric.id}
                    loading={loading}
                    value={value}
                    label={metric.title}
                    valueColorClass={metric.valueColorClass}
                    iconBgClass={metric.iconBgClass}
                    iconColorClass={metric.iconColorClass}
                    icon={metric.icon}
                  />
                );
              })}
            </div>

            {/* Compliance Scorecard */}
            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
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
                  <table className="w-full border-collapse"><tbody><TableSkeleton rows={2} columns={7} /></tbody></table>
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
                          <td className="px-6 py-3.5 text-[13.5px] text-[#dc2626] font-semibold align-middle">{item.daysOverdue}d</td>
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
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SOP OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'SOP Overview' && (
          <>
            {/* SOP KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-[28px]">
              {SOP_KPI.map((kpi) => (
                <MetricCard
                  key={kpi.label}
                  loading={sopLoading}
                  value={kpi.value}
                  label={kpi.label}
                  valueColorClass={kpi.valueColorClass}
                  iconBgClass={kpi.iconBgClass}
                  iconColorClass={kpi.iconColorClass}
                  icon={kpi.icon}
                />
              ))}
            </div>

            {/* SOP Progress Timeline Chart */}
            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  SOP Task Completion Progress
                </span>
                <span className="text-[12px] text-[#94a3b8] font-medium">Top SOPs by activity</span>
              </div>
              <div className="px-6 py-5">
                {sopLoading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="shimmer w-[180px] h-[14px] rounded" />
                        <div className="shimmer flex-1 h-[22px] rounded" />
                        <div className="shimmer w-[60px] h-[14px] rounded" />
                      </div>
                    ))}
                  </div>
                ) : sopProgressData.length === 0 ? (
                  <div className="text-center py-10 text-[#94a3b8] text-[13.5px]">No SOP activity data for the selected entities.</div>
                ) : (
                  <SopBarChart sopList={sopProgressData} />
                )}
              </div>
            </div>

            {/* SOP Progress Detail Table */}
            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  SOP Progress Details
                </span>
                {sopProgressData.length > 0 && (
                  <span className="text-[12px] font-semibold text-text-muted bg-[#f1f5f9] px-[10px] py-[3px] rounded-[12px]">
                    {sopProgressData.length} SOPs
                  </span>
                )}
              </div>
              <div className="overflow-x-auto w-full">
                {sopLoading ? (
                  <table className="w-full border-collapse"><tbody><TableSkeleton rows={4} columns={7} /></tbody></table>
                ) : sopProgressData.length === 0 ? (
                  <div className="text-center py-14 text-[#94a3b8] text-[13.5px] font-medium">
                    No SOP data available for the selected filters.
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#f1f5f9]">
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">SOP CODE</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">TITLE</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">ENTITY</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">STATUS</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">PROGRESS</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">TASKS</th>
                        <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">DUE DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSops.map(sop => (
                        <tr key={sop.sopId} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                          <td className="px-6 py-3.5 align-middle">
                            <span className="text-[12px] font-mono text-text-muted">{sop.sopCode}</span>
                          </td>
                          <td className="px-6 py-3.5 align-middle max-w-[200px]">
                            <span className="text-[13px] font-semibold text-[#1e293b] block truncate" title={sop.title}>{sop.title}</span>
                            {sop.frequency && (
                              <span className="text-[11px] text-[#94a3b8]">{sop.frequency}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-[13px] text-[#334155] align-middle">{sop.entity}</td>
                          <td className="px-6 py-3.5 align-middle">{sopStatusChip(sop.status)}</td>
                          <td className="px-6 py-3.5 align-middle min-w-[160px]">
                            <ProgressBar pct={sop.progressPercent} overdue={sop.overdueTasks} />
                          </td>
                          <td className="px-6 py-3.5 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[12px] text-[#334155]">
                                <span className="font-semibold text-[#059669]">{sop.completedTasks}</span>
                                <span className="text-[#94a3b8]">/{sop.totalTasks} done</span>
                              </span>
                              {sop.overdueTasks > 0 && (
                                <span className="text-[11px] text-[#dc2626] font-semibold">{sop.overdueTasks} overdue</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-[13px] text-[#334155] align-middle">
                            {sop.dueDate || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {!sopLoading && (
                <Pagination
                  currentPage={sopPage}
                  totalItems={sopProgressData.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setSopPage}
                  itemLabel="SOPs"
                />
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}

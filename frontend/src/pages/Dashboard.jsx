import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import { getSession } from '../auth/auth';
import { getDashboardSummary, getSopProgress } from '../services/api';
import { useEntity } from '../context/EntityContext';

const PAGE_SIZE = 5;

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

const CHART_COLORS = {
  completed: '#059669',
  pending: '#60a5fa',
  overdue: '#f87171',
};

const CHART_ICONS = {
  bar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ),
  stacked: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="15" width="4" height="6" rx="1"/>
      <rect x="3" y="9" width="4" height="6" rx="1" opacity="0.65"/>
      <rect x="3" y="3" width="4" height="6" rx="1" opacity="0.35"/>
      <rect x="10" y="11" width="4" height="10" rx="1"/>
      <rect x="10" y="6" width="4" height="5" rx="1" opacity="0.65"/>
      <rect x="10" y="3" width="4" height="3" rx="1" opacity="0.35"/>
      <rect x="17" y="8" width="4" height="13" rx="1"/>
      <rect x="17" y="4" width="4" height="4" rx="1" opacity="0.65"/>
    </svg>
  ),
  line: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 8 10 13 14 19 5"/>
      <circle cx="3" cy="17" r="2" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="10" r="2" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="14" r="2" fill="currentColor" stroke="none"/>
      <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),
};

function SopChart({ sopList }) {
  const [chartType, setChartType] = useState('bar');
  const [tooltip, setTooltip] = useState(null);

  const items = [...sopList].slice(0, 10);
  if (items.length === 0) return null;

  const W = 760, H = 300;
  const PAD = { top: 20, right: 20, bottom: 64, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = chartType === 'line'
    ? 100
    : Math.max(...items.map(s => s.totalTasks), 1);

  const yTicks = 5;
  const xStep = chartW / items.length;
  const barGroupW = xStep * 0.7;

  function yPos(val) {
    return PAD.top + chartH - (val / maxVal) * chartH;
  }

  function xCenter(i) {
    return PAD.left + i * xStep + xStep / 2;
  }

  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = Math.round((maxVal / yTicks) * i);
    return { val, y: yPos(val) };
  });

  function renderBars(i, sop) {
    if (chartType === 'stacked') {
      const cx = xCenter(i);
      const bw = barGroupW;
      const x = cx - bw / 2;
      const cH = (sop.completedTasks / maxVal) * chartH;
      const pH = (sop.pendingTasks / maxVal) * chartH;
      const oH = (sop.overdueTasks / maxVal) * chartH;
      const base = PAD.top + chartH;
      return (
        <g key={sop.sopId}>
          <rect x={x} y={base - cH} width={bw} height={cH || 1} fill={CHART_COLORS.completed} rx="2"/>
          <rect x={x} y={base - cH - pH} width={bw} height={pH || (sop.pendingTasks > 0 ? 1 : 0)} fill={CHART_COLORS.pending} rx="2"/>
          <rect x={x} y={base - cH - pH - oH} width={bw} height={oH || (sop.overdueTasks > 0 ? 1 : 0)} fill={CHART_COLORS.overdue} rx="2"/>
          <rect
            x={x} y={PAD.top} width={bw} height={chartH}
            fill="transparent"
            onMouseEnter={e => setTooltip({ i, sop, x: xCenter(i), y: yPos(sop.totalTasks) })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'default' }}
          />
        </g>
      );
    }
    const n = 3;
    const bw = barGroupW / n;
    const cx = xCenter(i) - barGroupW / 2;
    const base = PAD.top + chartH;
    const bars = [
      { val: sop.completedTasks, color: CHART_COLORS.completed },
      { val: sop.pendingTasks, color: CHART_COLORS.pending },
      { val: sop.overdueTasks, color: CHART_COLORS.overdue },
    ];
    return (
      <g key={sop.sopId}>
        {bars.map(({ val, color }, bi) => {
          const bH = (val / maxVal) * chartH;
          return <rect key={bi} x={cx + bi * bw} y={base - bH} width={bw - 1} height={bH || (val > 0 ? 1 : 0)} fill={color} rx="2"/>;
        })}
        <rect
          x={xCenter(i) - barGroupW / 2} y={PAD.top} width={barGroupW} height={chartH}
          fill="transparent"
          onMouseEnter={() => setTooltip({ i, sop, x: xCenter(i), y: PAD.top })}
          onMouseLeave={() => setTooltip(null)}
          style={{ cursor: 'default' }}
        />
      </g>
    );
  }

  function buildPolyline(key, color) {
    const pts = items.map((sop, i) => {
      const val = key === 'completed' ? sop.progressPercent
        : key === 'pending' ? (sop.totalTasks > 0 ? Math.round((sop.pendingTasks / sop.totalTasks) * 100) : 0)
        : (sop.totalTasks > 0 ? Math.round((sop.overdueTasks / sop.totalTasks) * 100) : 0);
      return `${xCenter(i)},${yPos(val)}`;
    }).join(' ');
    const dots = items.map((sop, i) => {
      const val = key === 'completed' ? sop.progressPercent
        : key === 'pending' ? (sop.totalTasks > 0 ? Math.round((sop.pendingTasks / sop.totalTasks) * 100) : 0)
        : (sop.totalTasks > 0 ? Math.round((sop.overdueTasks / sop.totalTasks) * 100) : 0);
      return { x: xCenter(i), y: yPos(val), sop, val };
    });
    return (
      <g key={key}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {dots.map(({ x, y, sop, val }, i) => (
          <circle
            key={i} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1.5"
            onMouseEnter={() => setTooltip({ i, sop, x, y })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </g>
    );
  }

  const tooltipW = 180, tooltipH = 94;
  const tooltipX = tooltip
    ? Math.min(Math.max(tooltip.x - tooltipW / 2, PAD.left), W - PAD.right - tooltipW)
    : 0;
  const tooltipY = tooltip
    ? Math.max(tooltip.y - tooltipH - 12, PAD.top)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CHART_COLORS.completed }} /> Completed
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CHART_COLORS.pending }} /> Pending
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CHART_COLORS.overdue }} /> Overdue
          </span>
          {chartType === 'line' && (
            <span className="text-[11px] text-[#94a3b8]">Y-axis shows % of total tasks</span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-[8px] p-1">
          {[['bar','Bar'], ['stacked','Stacked'], ['line','Line']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setChartType(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                chartType === id
                  ? 'bg-white text-[#2563eb] shadow-sm'
                  : 'text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              {CHART_ICONS[id]}
              {label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        {gridLines.map(({ val, y }) => (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {chartType === 'line' ? `${val}%` : val}
            </text>
          </g>
        ))}

        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="#e2e8f0" strokeWidth="1"/>
        <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH} stroke="#e2e8f0" strokeWidth="1"/>

        {chartType !== 'line' && items.map((sop, i) => renderBars(i, sop))}
        {chartType === 'line' && (
          <>
            {buildPolyline('completed', CHART_COLORS.completed)}
            {buildPolyline('pending', CHART_COLORS.pending)}
            {buildPolyline('overdue', CHART_COLORS.overdue)}
          </>
        )}

        {items.map((sop, i) => (
          <text
            key={sop.sopId}
            x={xCenter(i)}
            y={PAD.top + chartH + 14}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
            transform={`rotate(-35, ${xCenter(i)}, ${PAD.top + chartH + 14})`}
          >
            {sop.sopCode || sop.title?.slice(0, 10)}
          </text>
        ))}

        {tooltip && (
          <g>
            <rect
              x={tooltipX} y={tooltipY}
              width={tooltipW} height={tooltipH}
              rx="6" fill="#1e293b" opacity="0.93"
            />
            <text x={tooltipX + 10} y={tooltipY + 16} fontSize="11" fontWeight="600" fill="white">
              {tooltip.sop.sopCode || tooltip.sop.title?.slice(0, 20)}
            </text>
            <text x={tooltipX + 10} y={tooltipY + 32} fontSize="10" fill={CHART_COLORS.completed}>
              ✓ Completed: {tooltip.sop.completedTasks} ({tooltip.sop.progressPercent}%)
            </text>
            <text x={tooltipX + 10} y={tooltipY + 48} fontSize="10" fill={CHART_COLORS.pending}>
              ◷ Pending: {tooltip.sop.pendingTasks}
            </text>
            <text x={tooltipX + 10} y={tooltipY + 64} fontSize="10" fill={CHART_COLORS.overdue}>
              ⚠ Overdue: {tooltip.sop.overdueTasks}
            </text>
            <text x={tooltipX + 10} y={tooltipY + 80} fontSize="10" fill="#94a3b8">
              Total: {tooltip.sop.totalTasks} tasks · {tooltip.sop.entity}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

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

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      const data = await getDashboardSummary(selectedEntities, currentUser);
      if (data) setSummaryData(data);
      setLoading(false);
    }
    loadSummary();
  }, [selectedEntities, currentUser?.email]);

  useEffect(() => {
    async function loadSopProgress() {
      setSopLoading(true);
      const data = await getSopProgress(selectedEntities);
      setSopProgressData(Array.isArray(data) ? data : []);
      setSopLoading(false);
    }
    loadSopProgress();
  }, [selectedEntities]);

  const trackedTasks = summaryData?.metrics?.trackedTasks ?? 0;
  const approvedThisCycle = summaryData?.metrics?.approvedThisCycle ?? 0;
  const pendingReview = summaryData?.metrics?.pendingReview ?? 0;
  const overdue = summaryData?.metrics?.overdue ?? 0;
  const scorecard = summaryData?.scorecard ?? [];
  const overdueList = summaryData?.overdueList ?? [];
  const paginatedOverdue = overdueList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

        {activeTab === 'Task Overview' && (
          <>
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

        {activeTab === 'SOP Overview' && (
          <>
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

            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
              <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between">
                <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  SOP Task Completion Progress
                </span>
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
                  <SopChart sopList={sopProgressData} />
                )}
              </div>
            </div>

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

import { useState, useRef, useEffect } from 'react';


const PRESETS = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'CUSTOM', label: 'Custom Range...' },
];

export default function DateRangePicker({ rangeType, startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectPreset(id) {
    if (id === 'CUSTOM') {
      onChange({ rangeType: 'CUSTOM', startDate: startDate || '', endDate: endDate || '' });
    } else {
      onChange({ rangeType: id, startDate: '', endDate: '' });
      setIsOpen(false);
    }
  }

  function getDisplayText() {
    if (rangeType === 'ALL') return 'All Time';
    if (rangeType === 'TODAY') return 'Today';
    if (rangeType === 'LAST_7_DAYS') return 'Last 7 Days';
    if (rangeType === 'THIS_WEEK') return 'This Week';
    if (rangeType === 'THIS_MONTH') return 'This Month';
    if (rangeType === 'THIS_QUARTER') return 'This Quarter';
    if (rangeType === 'CUSTOM') {
      if (startDate && endDate) return `${startDate} to ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return 'Custom Date Range';
    }
    return 'All Time';
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className={`flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border px-3.5 text-xs font-medium text-slate-900 shadow-sm transition-all ${isOpen
            ? 'border-blue-600 bg-white ring-4 ring-blue-600/10'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2 overflow-hidden truncate">
          <svg className="h-4 w-4 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="font-medium text-slate-800">{getDisplayText()}</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-[280px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-[dropIn_0.15s_ease-out]">
          <div className="flex flex-col gap-0.5">
            {PRESETS.map(p => {
              const isSelected = rangeType === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors cursor-pointer ${isSelected
                      ? 'bg-blue-600/[0.08] text-blue-600 font-semibold'
                      : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  onClick={() => handleSelectPreset(p.id)}
                >
                  <span>{p.label}</span>
                  {isSelected && (
                    <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {rangeType === 'CUSTOM' && (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Start Date</span>
                <input
                  type="date"
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-[12.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                  value={startDate}
                  onChange={e => onChange({ rangeType: 'CUSTOM', startDate: e.target.value, endDate })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">End Date</span>
                <input
                  type="date"
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-[12.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                  value={endDate}
                  onChange={e => onChange({ rangeType: 'CUSTOM', startDate, endDate: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

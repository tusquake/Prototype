import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ value = [], options = [], onChange, name, placeholder = 'Select users...' }) {
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

  function toggleOption(optValue) {
    let nextValue;
    if (value.includes(optValue)) {
      if (value.length === 1) return; // Keep at least 1 user selected
      nextValue = value.filter(v => v !== optValue);
    } else {
      nextValue = [...value, optValue];
    }
    onChange({ target: { name, value: nextValue } });
  }

  const selectedLabels = options
    .filter(o => value.includes(o.value))
    .map(o => o.label.split(' (')[0]);

  const displayText = selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition-all ${isOpen
            ? 'border-blue-600 bg-white ring-4 ring-blue-600/15'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="max-w-[180px] truncate font-medium" title={displayText}>
          {displayText}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
            {value.length} selected
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
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1000] max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-[menuFadeIn_0.15s_ease-out]">
          {options.map(opt => {
            const isChecked = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={`flex items-center rounded-md px-3 py-2 text-xs transition-all cursor-pointer ${isChecked
                    ? 'bg-blue-600/[0.06] text-slate-900 hover:bg-slate-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                onClick={() => toggleOption(opt.value)}
              >
                <div className="flex w-full items-center gap-2.5">
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${isChecked
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300 bg-white'
                      }`}
                  >
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span>{opt.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

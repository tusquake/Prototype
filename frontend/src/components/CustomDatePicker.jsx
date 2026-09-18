import { useState, useRef, useEffect } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function formatDateISO(d) {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  minDate, 
  maxDate, 
  placeholder = "Select date",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse dates for logic
  const selectedDate = value ? new Date(value) : null;
  const minD = minDate ? new Date(minDate) : null;
  const maxD = maxDate ? new Date(maxDate) : null;

  // Strip time for accurate boundary comparison
  if (minD) minD.setHours(0, 0, 0, 0);
  if (maxD) maxD.setHours(0, 0, 0, 0);

  // Initialize view to selected date, or today, or minDate if today is blocked
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const today = new Date();
    if (minD && today < minD) return new Date(minD.getFullYear(), minD.getMonth(), 1);
    if (maxD && today > maxD) return new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Handle clicking outside to close popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handlePrevMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleDayClick(dayNum) {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
    onChange(formatDateISO(clickedDate));
    setIsOpen(false);
  }

  function isDayDisabled(year, month, dayNum) {
    const d = new Date(year, month, dayNum);
    d.setHours(0, 0, 0, 0);
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  }

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const dayCells = Array(firstDayIndex).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push(i);
  }

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-[42px] w-full items-center justify-between gap-2.5 rounded-lg border px-3 text-xs font-bold text-slate-800 transition-all ${
          disabled 
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
              ? 'border-blue-600 bg-white ring-2 ring-blue-600/20'
              : 'border-blue-400 bg-blue-50/30 hover:border-blue-500 hover:bg-blue-50/50' // Matched your form UI
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{selectedDate ? formatHumanDate(selectedDate) : <span className="text-slate-400 font-medium">{placeholder}</span>}</span>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[300] w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-[slideDown_0.15s_ease-out]">
          
          <div className="flex items-center justify-between px-1 mb-3">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-600 transition-all hover:bg-blue-600 hover:text-white"
              onClick={handlePrevMonth}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-[13px] font-bold text-slate-800">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-600 transition-all hover:bg-blue-600 hover:text-white"
              onClick={handleNextMonth}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
            {WEEKDAYS.map(w => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((dayNum, idx) => {
              if (!dayNum) {
                return <div key={`empty-${idx}`} className="h-8 select-none" />;
              }
              
              const isDisabled = isDayDisabled(year, month, dayNum);
              const isSelected = selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === dayNum;

              let dayClasses = "flex h-8 w-8 mx-auto items-center justify-center text-xs font-semibold rounded-md transition-all select-none ";

              if (isDisabled) {
                dayClasses += "text-slate-300 cursor-not-allowed bg-slate-50/50";
              } else if (isSelected) {
                dayClasses += "text-white bg-blue-600 shadow-sm cursor-pointer";
              } else {
                dayClasses += "text-slate-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700";
              }

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isDisabled}
                  className={dayClasses}
                  onClick={() => handleDayClick(dayNum)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
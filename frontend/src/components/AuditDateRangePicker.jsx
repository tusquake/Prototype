import { useState, useRef, useEffect } from 'react';
import styles from './AuditDateRangePicker.module.css';

const PRESETS = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'CUSTOM', label: 'Custom Range...' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getPresetDates(id) {
  const now = new Date(2026, 7, 28); // Standardized around August 28, 2026 for demo data consistency
  if (id === 'TODAY') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: today, end: today };
  }
  if (id === 'LAST_7_DAYS') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { start, end };
  }
  if (id === 'THIS_WEEK') {
    const dayOfWeek = now.getDay();
    const diffToMon = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diffToMon);
    const end = new Date(now.getFullYear(), now.getMonth(), diffToMon + 6);
    return { start, end };
  }
  if (id === 'THIS_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  if (id === 'THIS_QUARTER') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qMonth, 1);
    const end = new Date(now.getFullYear(), qMonth + 3, 0);
    return { start, end };
  }
  return { start: null, end: null };
}

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

function formatRangeSummary(start, end) {
  if (!start) return 'All Time Selected';
  if (!end || isSameDay(start, end)) return formatHumanDate(start);
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${formatHumanDate(start)} – ${formatHumanDate(end)}`;
}

function isSameDay(d1, d2) {
  return d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function AuditDateRangePicker({ rangeType, startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(2026, 7, 1));
  const [selStart, setSelStart] = useState(startDate ? new Date(startDate) : null);
  const [selEnd, setSelEnd] = useState(endDate ? new Date(endDate) : null);
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

  // Update selected dates when preset rangeType changes
  useEffect(() => {
    if (rangeType && rangeType !== 'CUSTOM' && rangeType !== 'ALL') {
      const { start, end } = getPresetDates(rangeType);
      setSelStart(start);
      setSelEnd(end);
      if (start) {
        setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
      }
    } else if (rangeType === 'ALL') {
      setSelStart(null);
      setSelEnd(null);
    }
  }, [rangeType]);

  function handleSelectPreset(id) {
    if (id === 'CUSTOM') {
      onChange({ rangeType: 'CUSTOM', startDate: formatDateISO(selStart), endDate: formatDateISO(selEnd) });
    } else {
      const { start, end } = getPresetDates(id);
      setSelStart(start);
      setSelEnd(end);
      if (start) {
        setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
      }
      onChange({
        rangeType: id,
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
      });
      setIsOpen(false);
    }
  }

  function handlePrevMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleDayClick(dayNum) {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);

    if (!selStart || (selStart && selEnd)) {
      setSelStart(clickedDate);
      setSelEnd(null);
    } else if (clickedDate < selStart) {
      setSelStart(clickedDate);
      setSelEnd(null);
    } else {
      setSelEnd(clickedDate);
    }
  }

  function handleApplyCustom() {
    const sStr = formatDateISO(selStart);
    const eStr = formatDateISO(selEnd);
    onChange({ rangeType: 'CUSTOM', startDate: sStr, endDate: eStr });
    setIsOpen(false);
  }

  function getDisplayText() {
    if (rangeType === 'ALL') return 'All Time';
    if (rangeType === 'TODAY') return 'Today (Aug 28)';
    if (rangeType === 'LAST_7_DAYS') return 'Last 7 Days (Aug 23 – 28)';
    if (rangeType === 'THIS_WEEK') return 'This Week (Aug 24 – 30)';
    if (rangeType === 'THIS_MONTH') return 'This Month (August 2026)';
    if (rangeType === 'THIS_QUARTER') return 'This Quarter (Q3 2026)';
    if (rangeType === 'CUSTOM') {
      const s = selStart || (startDate ? new Date(startDate) : null);
      const e = selEnd || (endDate ? new Date(endDate) : null);
      if (s || e) return formatRangeSummary(s, e);
      return 'Custom Range';
    }
    return 'All Time';
  }

  // Calendar Day Calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const dayCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push(i);
  }

  function isDayInRange(dayNum) {
    if (!selStart || !selEnd || !dayNum) return false;
    const current = new Date(year, month, dayNum);
    const startStr = formatDateISO(selStart);
    const endStr = formatDateISO(selEnd);
    const currStr = formatDateISO(current);

    return currStr >= startStr && currStr <= endStr;
  }

  return (
    <div className={styles.pickerContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.triggerLeft}>
          <svg className={styles.calIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={styles.labelText}>{getDisplayText()}</span>
        </span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
          width="15"
          height="15"
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
        <div className={styles.popoverCard}>
          {/* Presets Sidebar Column */}
          <div className={styles.presetsCol}>
            {PRESETS.map(p => (
              <div
                key={p.id}
                className={`${styles.presetItem} ${rangeType === p.id ? styles.presetActive : ''}`}
                onClick={() => handleSelectPreset(p.id)}
              >
                <span>{p.label}</span>
                {rangeType === p.id && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Custom Mini Calendar Column */}
          <div className={styles.calendarCol}>
            <div className={styles.calendarHeader}>
              <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className={styles.monthTitle}>
                {MONTH_NAMES[month]} {year}
              </span>
              <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className={styles.weekDaysGrid}>
              {WEEKDAYS.map(w => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {dayCells.map((dayNum, idx) => {
                if (!dayNum) {
                  return <div key={`empty-${idx}`} className={`${styles.dayCell} ${styles.emptyCell}`} />;
                }
                const cellDate = new Date(year, month, dayNum);
                const isStart = isSameDay(cellDate, selStart);
                const isEnd = isSameDay(cellDate, selEnd);
                const inRange = isDayInRange(dayNum);

                let cellClass = styles.dayCell;
                if (isStart || isEnd) cellClass += ` ${styles.rangeEndpoint}`;
                else if (inRange) cellClass += ` ${styles.inRange}`;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    className={cellClass}
                    onClick={() => {
                      handleDayClick(dayNum);
                      if (rangeType !== 'CUSTOM') onChange({ rangeType: 'CUSTOM', startDate: formatDateISO(cellDate), endDate: '' });
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <div className={styles.footerRow}>
              <span className={styles.rangeSummary}>
                {formatRangeSummary(selStart, selEnd)}
              </span>
              <button type="button" className={styles.applyBtn} onClick={handleApplyCustom}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

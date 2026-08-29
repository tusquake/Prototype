import { useState, useRef, useEffect } from 'react';
import styles from './DateRangePicker.module.css';

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
    <div className={styles.pickerContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.leftText}>
          <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={styles.label}>{getDisplayText()}</span>
        </span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.presetList}>
            {PRESETS.map(p => (
              <div
                key={p.id}
                className={`${styles.presetItem} ${rangeType === p.id ? styles.selectedPreset : ''}`}
                onClick={() => handleSelectPreset(p.id)}
              >
                <span>{p.label}</span>
                {rangeType === p.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {rangeType === 'CUSTOM' && (
            <div className={styles.customInputs}>
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Start Date</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={e => onChange({ rangeType: 'CUSTOM', startDate: e.target.value, endDate })}
                />
              </div>
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>End Date</span>
                <input
                  type="date"
                  className={styles.dateInput}
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

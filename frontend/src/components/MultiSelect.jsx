import { useState, useRef, useEffect } from 'react';
import styles from './MultiSelect.module.css';

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
    <div className={styles.selectContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.selectTrigger} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.selectedText} title={displayText}>
          {displayText}
        </span>
        <div className={styles.triggerRight}>
          <span className={styles.badgeCount}>{value.length} selected</span>
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
        </div>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map(opt => {
            const isChecked = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={`${styles.optionItem} ${isChecked ? styles.selectedOption : ''}`}
                onClick={() => toggleOption(opt.value)}
              >
                <div className={styles.checkboxLabel}>
                  <div className={`${styles.customCheckbox} ${isChecked ? styles.checked : ''}`}>
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

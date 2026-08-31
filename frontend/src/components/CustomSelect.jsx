import { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.css';

export default function CustomSelect({ value, options, onChange, name, dropUp: explicitDropUp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUp, setIsUp] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setIsUp(explicitDropUp !== undefined ? explicitDropUp : spaceBelow < 230);
    }
    setIsOpen(!isOpen);
  }

  function handleSelect(optionValue) {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  }

  return (
    <div className={styles.selectContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.selectTrigger} ${isOpen ? styles.active : ''}`}
        onClick={handleToggle}
      >
        <span className={styles.selectedText}>{selectedOption?.label || value}</span>
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
        <div className={isUp ? styles.dropdownMenuUp : styles.dropdownMenu}>
          {options.map(opt => (
            <div
              key={opt.value}
              className={`${styles.optionItem} ${opt.value === value ? styles.selectedOption : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

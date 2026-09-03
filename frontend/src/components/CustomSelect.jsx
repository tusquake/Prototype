import { useState, useRef, useEffect } from 'react';


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
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-[13.5px] font-normal text-slate-900 outline-none transition-all ${isOpen
            ? 'border-blue-600 bg-white ring-4 ring-blue-600/15'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          }`}
        onClick={handleToggle}
      >
        <span className="truncate font-medium">{selectedOption?.label || value}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
        <div
          className={`absolute left-0 right-0 z-[1000] max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${isUp
              ? 'bottom-[calc(100%+6px)] animate-[menuFadeInUp_0.15s_ease-out]'
              : 'top-[calc(100%+6px)] animate-[menuFadeIn_0.15s_ease-out]'
            }`}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`flex items-center justify-between rounded-md px-3 py-2 text.5 font-normal transition-all cursor-pointer ${isSelected
                    ? 'bg-blue-600/[0.08] text-blue-600 font-semibold hover:bg-blue-600/[0.12] hover:text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    className="h-3.5 w-3.5 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

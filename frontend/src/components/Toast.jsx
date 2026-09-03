import { useEffect } from 'react';

export default function Toast({
  message,
  type = 'success',
  duration = 3500,
  onClose
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const iconSvg = type === 'error' ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const toastVariants = {
    success: 'bg-green-50 text-green-700 border-green-300 shadow-[0_10px_25px_-5px_rgba(22,163,74,0.15),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
    error: 'bg-red-50 text-red-700 border-red-300 shadow-[0_10px_25px_-5px_rgba(220,38,38,0.15),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
    info: 'bg-blue-50 text-blue-700 border-blue-300 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.15),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
  };

  const currentVariant = toastVariants[type] || toastVariants.info;

  return (
   <div className={`fixed right-7 top-6 z-[9999] flex max-w-[440px] items-center gap-3 rounded-xl border p-3.5 px-5 text-[13.5px] font-semibold animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)] ${currentVariant}`}>
      <div className="flex shrink-0 items-center">{iconSvg}</div>
      <span className="flex-1 leading-snug">{message}</span>
      <button 
        type="button" 
        className="flex items-center justify-center rounded p-0.5 text-current opacity-70 transition-opacity hover:opacity-100" 
        onClick={onClose}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

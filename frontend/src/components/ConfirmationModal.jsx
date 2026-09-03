export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText,
  confirmVariant = 'primary', // 'primary' | 'success' | 'danger'
  submitting = false,
  onConfirm,
  onClose,
  children,
}) {
  if (!isOpen) return null;

  const iconVariantClasses = {
    danger: 'bg-red-100 text-red-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
  };

  const btnVariantClasses = {
    danger: 'bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700',
    success: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700',
    warning: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700 hover:border-amber-700',
  };

  const currentIconClasses = iconVariantClasses[confirmVariant] || iconVariantClasses.warning;
  const currentBtnClasses = btnVariantClasses[confirmVariant] || btnVariantClasses.warning;

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#091124]/60 p-5 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="flex w-full max-w-[420px] flex-col items-center rounded-2xl bg-white p-6 text-center shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        {/* Icon Wrapper */}
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${currentIconClasses}`}>
          {confirmVariant === 'danger' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : confirmVariant === 'success' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        {/* Title & Message */}
        <h3 className="mb-1.5 text-lg font-bold text-slate-900">{title}</h3>
        <p className="mb-5 text-xs text-slate-500 leading-relaxed">{message}</p>

        {children}

        {/* Actions */}
        <div className="mt-2 flex w-full items-center justify-end gap-3">
          <button 
            type="button" 
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60" 
            onClick={onClose} 
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`w-full rounded-lg border px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${currentBtnClasses}`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

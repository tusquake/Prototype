import { useState, useEffect } from 'react';

export default function ActionConfirmationModal({
  isOpen,
  mode = 'REJECT', // 'approve' | 'reject'
  title,
  subtitle,
  inputLabel,
  buttonText,
  onClose,
  onSubmit,
  isSubmitting = false,
  requireComment = true
}) {
  const [comment, setComment] = useState('');

  // Reset comment when modal opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Theme configuration based on mode
  const theme = {
    APPROVE: {
      headerBg: 'bg-green-50',
      headerBorder: 'border-green-200',
      textTitle: 'text-green-700',
      textSubtitle: 'text-green-800',
      closeBtn: 'text-green-600 hover:bg-green-100',
      label: 'text-green-700',
      focusRing: 'focus:border-green-600 focus:ring-green-600/15',
      submitBtn: 'bg-green-600 hover:bg-green-700 shadow-[0_4px_12px_rgba(22,163,74,0.35)]',
      defaultTitle: 'Approve Item',
      defaultLabel: 'APPROVAL COMMENTS',
      defaultBtnText: 'Confirm Approval'
    },
    REJECT: {
      headerBg: 'bg-[#fff1f2]',
      headerBorder: 'border-[#fecdd3]',
      textTitle: 'text-[#be123c]',
      textSubtitle: 'text-[#9f1239]',
      closeBtn: 'text-[#be123c] hover:bg-rose-100',
      label: 'text-[#be123c]',
      focusRing: 'focus:border-[#dc2626] focus:ring-[rgba(220,38,38,0.15)]',
      submitBtn: 'bg-[#dc2626] hover:bg-[#b91c1c] shadow-[0_4px_12px_rgba(220,38,38,0.35)]',
      defaultTitle: 'Reject Item',
      defaultLabel: 'REJECTION FEEDBACK',
      defaultBtnText: 'Confirm Rejection'
    }
  }[mode];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(comment);
  };

  return (
    <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6">
      <div className="bg-white rounded-[16px] w-full max-w-[480px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden animate-modal-slide-in">
        
        {/* Header */}
        <div className={`p-[24px_28px] border-b flex items-start justify-between ${theme.headerBg} ${theme.headerBorder}`}>
          <div>
            <h3 className={`text-[17px] font-bold tracking-[-0.2px] ${theme.textTitle}`}>
              {title || theme.defaultTitle}
            </h3>
            {subtitle && (
              <p className={`text-[12.5px] mt-0.5 ${theme.textSubtitle}`}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-[8px] cursor-pointer flex items-center justify-center transition-all duration-150 bg-transparent ${theme.closeBtn}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-7 grid grid-cols-1 gap-[18px] max-h-[72vh] overflow-y-auto [scrollbar-gutter:stable]">
            <div className="col-span-full flex flex-col gap-1.5 min-w-0">
              <label className={`text-[12px] font-bold uppercase tracking-[0.4px] ${theme.label}`}>
                {inputLabel || theme.defaultLabel} {requireComment && '*'}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                required={requireComment}
                rows={4}
                placeholder="Enter your remarks here..."
                className={`w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-white text-[13.5px] text-slate-800 outline-none transition-all duration-150 resize-y min-h-[85px] leading-normal focus:bg-white focus:ring-3 ${theme.focusRing}`}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-[18px_28px] border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-[9px] rounded-[8px] border border-[#cbd5e1] bg-white text-[#475569] text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-[22px] py-[9px] rounded-[8px] border-none text-white text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${theme.submitBtn}`}
            >
              {isSubmitting ? 'Processing...' : (buttonText || theme.defaultBtnText)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
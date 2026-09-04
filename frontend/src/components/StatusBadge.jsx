

const CONFIG = {
  OPEN: {
    label: 'Open',
    cls: 'open',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    cls: 'pending',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  APPROVED: {
    label: 'Approved',
    cls: 'approved',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  REJECTED: {
    label: 'Rejected (Resubmit Allowed)',
    cls: 'rejected',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  PERMANENTLY_REJECTED: {
    label: 'Permanently Rejected',
    cls: 'permanentlyRejected',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
};

export default function StatusBadge({ status }) {
  const badgeVariants = {
    open: 'bg-amber-500/10 text-amber-600',
    pending: 'bg-blue-600/10 text-blue-600',
    approved: 'bg-green-600/10 text-green-600',
    rejected: 'bg-red-600/10 text-red-600',
    permanentlyRejected: 'bg-red-50 text-red-800 border border-red-300',
  };

  const { label, cls, icon } = CONFIG[status] ?? { label: status, cls: 'open', icon: null };
  const currentVariant = badgeVariants[cls] || badgeVariants.open;

  return (
    <span className={`inline-flex items-center gap-1.25 rounded-full px-2.5 py-0.75 text-[11px] font-semibold whitespace-nowrap ${currentVariant}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

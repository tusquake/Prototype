export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  itemLabel = 'items'
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3.5">
      <span className="text-xs font-medium text-slate-500">
        Showing {startItem} – {endItem} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-[0_2px_4px_rgba(37,99,235,0.2)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-40 disabled:shadow-none"
          disabled={currentPage === 1}
          onClick={() => onPageChange && onPageChange(Math.max(currentPage - 1, 1))}
        >
          Previous
        </button>
        <span className="rounded-md bg-slate-100 px-3 py-1.25 text-[12.5px] font-semibold text-slate-800">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-[0_2px_4px_rgba(37,99,235,0.2)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-40 disabled:shadow-none"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(currentPage + 1, totalPages))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

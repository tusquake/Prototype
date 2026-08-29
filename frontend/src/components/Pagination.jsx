import styles from './Pagination.module.css';

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
    <div className={styles.paginationBar}>
      <span className={styles.paginationInfo}>
        Showing {startItem} – {endItem} of {totalItems} {itemLabel}
      </span>
      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage === 1}
          onClick={() => onPageChange && onPageChange(Math.max(currentPage - 1, 1))}
        >
          Previous
        </button>
        <span className={styles.pageBadge}>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(currentPage + 1, totalPages))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Pagination — reusable pagination bar.
 *
 * Shows "Mostrando X – Y de Z registros", page-size selector,
 * prev/next buttons and numbered page buttons with ellipsis.
 *
 * Usage:
 *   <Pagination
 *     currentPage={page}
 *     totalItems={total}
 *     pageSize={size}
 *     onPageChange={setPage}
 *     onPageSizeChange={setSize}
 *   />
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build the list of page numbers / ellipsis markers to render. */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  const MAX_BUTTONS = 5;

  if (total <= MAX_BUTTONS) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);

  // Ensure we always show 3 middle buttons when possible
  if (current <= 3) {
    start = 2;
    end = 4;
  } else if (current >= total - 2) {
    start = total - 3;
    end = total - 1;
  }

  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');

  pages.push(total);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
      {/* Left: record info */}
      <span className="whitespace-nowrap">
        Mostrando{' '}
        <span className="font-semibold">{from}</span>
        {' – '}
        <span className="font-semibold">{to}</span>
        {' de '}
        <span className="font-semibold">{totalItems}</span>{' '}
        registros
      </span>

      {/* Center: page-size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-gray-500">
            Mostrar
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Right: page buttons */}
      <nav className="flex items-center gap-1" aria-label="Paginación">
        {/* Previous */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-100`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers(currentPage, totalPages).map((page, idx) =>
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex h-8 min-w-[2rem] items-center justify-center text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`${btnBase} ${
                page === currentPage
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-100`}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

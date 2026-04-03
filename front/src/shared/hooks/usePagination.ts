import { useState, useMemo, useEffect } from 'react';

/**
 * usePagination — client-side pagination over an array of items.
 *
 * Automatically resets to page 1 when `items` reference or `pageSize` changes.
 *
 * Usage:
 *   const { paginatedItems, currentPage, pageSize, setCurrentPage, setPageSize, totalItems }
 *     = usePagination(allRows, 25);
 */
export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to first page when the dataset or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items, pageSize]);

  const totalItems = items.length;

  const paginatedItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  return {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems,
    totalItems,
  } as const;
}

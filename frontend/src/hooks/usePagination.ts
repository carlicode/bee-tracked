import { useMemo, useState, useEffect } from 'react';

export interface PaginationResult<T> {
  page: number;
  totalPages: number;
  pageItems: T[];
  goTo: (p: number) => void;
  prev: () => void;
  next: () => void;
  pageSize: number;
  totalItems: number;
}

/**
 * Client-side pagination over an already-filtered array.
 * Resets to page 1 whenever `items` reference changes.
 */
export function usePagination<T>(
  items: T[],
  pageSize = 50,
): PaginationResult<T> {
  const [page, setPage] = useState(1);

  // Reset to first page whenever the dataset changes (filter applied, tab switched, etc.)
  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    totalPages,
    pageItems,
    goTo: (p) => setPage(Math.max(1, Math.min(p, totalPages))),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
    pageSize,
    totalItems: items.length,
  };
}

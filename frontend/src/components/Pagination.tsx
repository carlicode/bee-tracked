interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onGoTo: (p: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Generates the page numbers to show: always first, last, current ± 1, and ellipsis gaps */
function pageWindows(page: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onGoTo,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const windows = pageWindows(page, totalPages);

  const btnBase =
    'min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition';
  const btnActive =
    'bg-beeadmin-purple text-white';
  const btnDefault =
    'bg-white border border-gray-200 text-gray-700 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 border-t border-gray-100 bg-white">
      <p className="text-xs text-gray-500">
        Mostrando <strong className="text-gray-700">{from}–{to}</strong> de{' '}
        <strong className="text-gray-700">{totalItems}</strong>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1}
          className={`${btnBase} ${btnDefault}`}
          aria-label="Página anterior"
        >
          ←
        </button>

        {windows.map((w, i) =>
          w === '...' ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={w}
              type="button"
              onClick={() => onGoTo(w)}
              className={`${btnBase} ${w === page ? btnActive : btnDefault}`}
              aria-current={w === page ? 'page' : undefined}
            >
              {w}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className={`${btnBase} ${btnDefault}`}
          aria-label="Página siguiente"
        >
          →
        </button>
      </div>
    </div>
  );
}

"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  windowSize?: number;
}

function getPageWindow(current: number, total: number, windowSize: number): number[] {
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange, windowSize = 5 }: PaginationProps) {
  const pages = getPageWindow(currentPage, totalPages, windowSize);

  return (
    <div className="flex justify-center items-center gap-1">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
        aria-label="Sebelumnya"
      >
        &#8249;
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
            p === currentPage
              ? "bg-indigo-100 text-indigo-700"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
        aria-label="Selanjutnya"
      >
        &#8250;
      </button>
    </div>
  );
}

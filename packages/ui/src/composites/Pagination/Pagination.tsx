'use client';

import { forwardRef, useMemo } from 'react';

import { cn } from '../../lib/cn';
import {
  paginationContainerClasses,
  paginationTextClasses,
  paginationButtonContainerClasses,
  paginationButtonClasses,
} from './Pagination.styles';
import type { PaginationProps, TablePaginationProps } from './Pagination.types';

export const TablePagination = forwardRef<HTMLDivElement, TablePaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      totalRecords,
      recordsLabel = 'records',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(paginationContainerClasses, className)}
        {...props}
      >
        <p className={paginationTextClasses}>
          Page {currentPage} of {totalPages}
          {totalRecords !== undefined && ` · Total ${totalRecords} ${recordsLabel}`}
        </p>
        <div className={paginationButtonContainerClasses}>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className={paginationButtonClasses}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={paginationButtonClasses}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }
);

TablePagination.displayName = 'TablePagination';

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      totalRecords,
      recordsLabel = 'records',
      pageSize,
      pageSizeOptions,
      onPageSizeChange,
      showFirstLast = true,
      showPageNumbers = true,
      siblingCount = 1,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const pageNumbers = useMemo(() => {
      if (!showPageNumbers || totalPages <= 1) return [];

      const totalPageNumbers = siblingCount * 2 + 5; // siblingCount + first + last + current + 2*dots

      if (totalPages <= totalPageNumbers) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

      const firstPageIndex = 1;
      const lastPageIndex = totalPages;

      if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount;
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        return [...leftRange, '...', totalPages];
      }

      if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount;
        const rightRange = Array.from(
          { length: rightItemCount },
          (_, i) => totalPages - rightItemCount + i + 1
        );
        return [firstPageIndex, '...', ...rightRange];
      }

      if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = Array.from(
          { length: rightSiblingIndex - leftSiblingIndex + 1 },
          (_, i) => leftSiblingIndex + i
        );
        return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
      }

      return [];
    }, [currentPage, totalPages, siblingCount, showPageNumbers]);

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination Navigation"
        className={cn(paginationContainerClasses, 'flex-wrap gap-3', className)}
        {...props}
      >
        {/* Info text & Page Size Selector */}
        <div className="flex items-center gap-3">
          <p className={paginationTextClasses}>
            Page <span className="font-semibold text-text">{currentPage}</span> of{' '}
            <span className="font-semibold text-text">{totalPages || 1}</span>
            {totalRecords !== undefined && ` · ${totalRecords} ${recordsLabel}`}
          </p>

          {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>Show:</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                disabled={disabled}
                className="bg-black/30 text-text border border-border-subtle rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-background text-text">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Buttons & Number Links */}
        <div className={cn(paginationButtonContainerClasses, 'items-center')}>
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={disabled || currentPage <= 1}
              className={paginationButtonClasses}
              aria-label="Go to first page"
            >
              « First
            </button>
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={disabled || currentPage <= 1}
            className={paginationButtonClasses}
            aria-label="Go to previous page"
          >
            ← Prev
          </button>

          {showPageNumbers &&
            pageNumbers.map((page, idx) => {
              if (page === '...') {
                return (
                  <span
                    key={`dots-${idx}`}
                    className="px-2 py-1 text-xs text-text-muted select-none"
                    aria-hidden="true"
                  >
                    …
                  </span>
                );
              }

              const isCurrent = page === currentPage;

              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => onPageChange(Number(page))}
                  disabled={disabled}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`Page ${page}`}
                  className={cn(
                    'min-w-[32px] h-8 px-2.5 text-xs rounded-lg border transition-all flex items-center justify-center font-medium',
                    isCurrent
                      ? 'bg-accent-purple text-white border-accent-purple shadow-glow-sm'
                      : 'glass border-border-subtle text-text-secondary hover:text-white hover:border-accent-purple/40'
                  )}
                >
                  {page}
                </button>
              );
            })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={disabled || currentPage >= totalPages}
            className={paginationButtonClasses}
            aria-label="Go to next page"
          >
            Next →
          </button>

          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={disabled || currentPage >= totalPages}
              className={paginationButtonClasses}
              aria-label="Go to last page"
            >
              Last »
            </button>
          )}
        </div>
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';

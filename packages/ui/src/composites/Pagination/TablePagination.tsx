'use client';

import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  paginationContainerClasses,
  paginationTextClasses,
  paginationButtonContainerClasses,
  paginationButtonClasses,
} from './Pagination.styles';
import type { TablePaginationProps } from './Pagination.types';

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

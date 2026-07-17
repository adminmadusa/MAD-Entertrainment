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
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={paginationButtonClasses}
          >
            ← Prev
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={paginationButtonClasses}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }
);

TablePagination.displayName = 'TablePagination';

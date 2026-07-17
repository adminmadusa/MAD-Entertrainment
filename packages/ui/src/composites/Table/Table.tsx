import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  tableWrapperClasses,
  tableClasses,
  tableHeaderClasses,
  tableBodyClasses,
  tableFooterClasses,
  tableRowClasses,
  tableHeadClasses,
  tableCellClasses,
  tableCaptionClasses,
} from './Table.styles';
import type {
  TableProps,
  TableHeaderProps,
  TableBodyProps,
  TableFooterProps,
  TableRowProps,
  TableHeadProps,
  TableCellProps,
  TableCaptionProps,
} from './Table.types';

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className={tableWrapperClasses}>
      <table
        ref={ref}
        className={cn(tableClasses, className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, stickyHeader, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        tableHeaderClasses,
        stickyHeader && 'sticky top-0 z-sticky-header [&_th]:bg-bg-card',
        className
      )}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn(tableBodyClasses, className)}
      {...props}
    />
  )
);
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn(tableFooterClasses, className)}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(tableRowClasses, className)}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

const getStickyClasses = (sticky?: 'start' | 'end', showDivider?: boolean) => {
  if (!sticky) return '';
  return cn(
    'sticky z-sticky-cell bg-bg-card group-hover:bg-bg-card-hover',
    sticky === 'start' && 'start-0',
    sticky === 'end' && 'end-0',
    showDivider && sticky === 'start' && 'shadow-[1px_0_0_var(--glass-border)]',
    showDivider && sticky === 'end' && 'shadow-[-1px_0_0_var(--glass-border)]'
  );
};

const getStickyStyle = (sticky?: 'start' | 'end', stickyOffset?: number | string) => {
  if (!sticky || stickyOffset === undefined) return undefined;
  return sticky === 'start' ? { insetInlineStart: stickyOffset } : { insetInlineEnd: stickyOffset };
};

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sticky, stickyOffset, showStickyDivider, style, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(tableHeadClasses, getStickyClasses(sticky, showStickyDivider), className)}
      style={{ ...style, ...getStickyStyle(sticky, stickyOffset) }}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, sticky, stickyOffset, showStickyDivider, style, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(tableCellClasses, getStickyClasses(sticky, showStickyDivider), className)}
      style={{ ...style, ...getStickyStyle(sticky, stickyOffset) }}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn(tableCaptionClasses, className)}
      {...props}
    />
  )
);
TableCaption.displayName = 'TableCaption';

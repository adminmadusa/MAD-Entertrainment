import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export type TableProps = HTMLAttributes<HTMLTableElement>;
export type { ActionPhase } from './FloatingActionBar';
export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  stickyHeader?: boolean;
}
export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableFooterProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

export interface TableStickyProps {
  sticky?: 'start' | 'end';
  stickyOffset?: number | string;
  showStickyDivider?: boolean;
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement>, TableStickyProps {}
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, TableStickyProps {}
export type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;

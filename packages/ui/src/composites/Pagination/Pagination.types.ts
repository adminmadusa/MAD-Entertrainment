export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  recordsLabel?: string;
  className?: string;
}

export interface PaginationProps extends TablePaginationProps {
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  showFirstLast?: boolean;
  showPageNumbers?: boolean;
  siblingCount?: number;
  disabled?: boolean;
}

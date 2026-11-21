'use client';

import { Checkbox, TableHead, TableHeader, TableRow } from '@mad/ui';

export interface AdminEventsTableHeaderProps {
  bulkSelection: {
    allSelected: boolean;
    indeterminate: boolean;
    selectAll: () => void;
    clearSelection: () => void;
  };
  sortField: 'title' | 'startDate' | 'status' | 'createdAt' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'title' | 'startDate' | 'status' | 'createdAt') => void;
}

export function AdminEventsTableHeader({
  bulkSelection,
  sortField,
  sortOrder,
  onSort,
}: AdminEventsTableHeaderProps) {
  return (
    <TableHeader stickyHeader>
      <TableRow>
        <TableHead sticky="start" className="py-3.5 px-5 w-12">
          <Checkbox
            checked={bulkSelection.allSelected}
            indeterminate={bulkSelection.indeterminate}
            onChange={() =>
              bulkSelection.allSelected
                ? bulkSelection.clearSelection()
                : bulkSelection.selectAll()
            }
            aria-label="Select all events on this page"
          />
        </TableHead>
        <TableHead
          onClick={() => onSort('title')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSort('title');
            }
          }}
          tabIndex={0}
          role="columnheader"
          aria-sort={
            sortField === 'title'
              ? sortOrder === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none'
          }
          className="py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded"
        >
          Event {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
        </TableHead>
        <TableHead className="py-3.5 px-4 text-text-secondary select-none">Category</TableHead>
        <TableHead
          onClick={() => onSort('startDate')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSort('startDate');
            }
          }}
          tabIndex={0}
          role="columnheader"
          aria-sort={
            sortField === 'startDate'
              ? sortOrder === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none'
          }
          className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded"
        >
          Event Starts {sortField === 'startDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
        </TableHead>
        <TableHead
          onClick={() => onSort('status')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSort('status');
            }
          }}
          tabIndex={0}
          role="columnheader"
          aria-sort={
            sortField === 'status'
              ? sortOrder === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none'
          }
          className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded"
        >
          Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
        </TableHead>

        <TableHead className="py-3.5 px-5 text-right select-none">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}

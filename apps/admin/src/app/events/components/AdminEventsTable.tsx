'use client';

import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Checkbox,
  TablePagination,
} from '@mad/ui';
import { CalendarDays, Search } from '@mad/ui/icons';
import { extractApiError } from '@/lib/api/client';
import type { AdminEvent } from '@/lib/api/admin/event.service';
import type { EventStatus } from '@mad/shared';

import { AdminEventsTableRow } from './AdminEventsTableRow';

interface AdminEventsTableProps {
  events: AdminEvent[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  search: string;
  statusFilter: string;
  refetch: () => void;
  canMutateEvents: boolean;
  bulkSelection: {
    allSelected: boolean;
    indeterminate: boolean;
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
  };
  sortField: 'title' | 'startDate' | 'status' | 'createdAt' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'title' | 'startDate' | 'status' | 'createdAt') => void;
  optimisticStatuses: Record<string, EventStatus>;
  statusUpdateMutation: {
    isPending: boolean;
    variables?: { id: string };
    mutate: (args: { id: string; status: EventStatus; eventVersion: number }) => void;
  };
  onDeleteClick: (event: AdminEvent) => void;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange: (page: number) => void;
}

export function AdminEventsTable({
  events,
  isLoading,
  isError,
  error,
  search,
  statusFilter,
  refetch,
  canMutateEvents,
  bulkSelection,
  sortField,
  sortOrder,
  onSort,
  optimisticStatuses,
  statusUpdateMutation,
  onDeleteClick,
  pagination,
  onPageChange,
}: AdminEventsTableProps) {
  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5">
            <div className="h-4 bg-white/5 rounded w-48" />
          </TableCell>
          <TableCell className="py-4 px-4">
            <div className="h-4 bg-white/5 rounded w-20" />
          </TableCell>
          <TableCell className="py-4 px-4">
            <div className="h-4 bg-white/5 rounded w-24" />
          </TableCell>
          <TableCell className="py-4 px-4">
            <div className="h-4 bg-white/5 rounded w-16" />
          </TableCell>
          <TableCell className="py-4 px-4">
            <div className="h-4 bg-white/5 rounded w-12" />
          </TableCell>
          <TableCell className="py-4 px-5">
            <div className="h-4 bg-white/5 rounded w-20 ml-auto" />
          </TableCell>
        </TableRow>
      ));
    }

    if (isError) {
      const errorMessage = extractApiError(error).message || 'Failed to load events.';
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={<Search />}
              title="Unable to load events"
              description={errorMessage}
              action={
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors"
                >
                  Retry Loading
                </button>
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    if (events.length === 0) {
      const isFiltered = search.trim() !== '' || statusFilter !== '';
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={isFiltered ? <Search /> : <CalendarDays />}
              title={isFiltered ? 'No results match your search.' : 'No events created yet.'}
              description={isFiltered ? 'Try changing your filters or search criteria.' : undefined}
              action={
                !isFiltered ? (
                  <Link
                    href="/events/new"
                    className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors"
                  >
                    Create Event
                  </Link>
                ) : undefined
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return events.map((event) => (
      <AdminEventsTableRow
        key={event._id}
        event={event}
        isSelected={bulkSelection.isSelected(event._id)}
        onToggleSelect={() => bulkSelection.toggle(event._id)}
        canMutateEvents={canMutateEvents}
        optimisticStatus={optimisticStatuses[event._id]}
        isStatusPending={
          statusUpdateMutation.isPending && statusUpdateMutation.variables?.id === event._id
        }
        onStatusChange={(newStatus) =>
          statusUpdateMutation.mutate({
            id: event._id,
            status: newStatus,
            eventVersion: event.eventVersion ?? 1,
          })
        }
        onDeleteClick={() => onDeleteClick(event)}
      />
    ));
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-x-auto">
      <Table className="min-w-[900px]">
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
        <TableBody>{renderTableBody()}</TableBody>
      </Table>

      {pagination && (
        <TablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          totalRecords={pagination.total}
          recordsLabel="events"
        />
      )}
    </div>
  );
}

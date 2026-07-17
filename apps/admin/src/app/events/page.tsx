'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetEvents, adminDeleteEvent, adminBulkDeleteEvents, adminUpdateEvent, type AdminEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { EVENT_STATUS_METADATA, EVENT_STATUS_TRANSITIONS, EventStatus, AdminRole } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, FloatingActionBar, EmptyState, Checkbox, useBulkSelection } from '@mad/ui';
import { CalendarDays, Search } from '@mad/ui/icons';
import { formatEventDate } from '@mad/utils';

const EVENT_STATUS_FILTER_OPTIONS = Object.entries(EVENT_STATUS_METADATA);
const getEventStatusMeta = (status?: EventStatus) =>
  status && status in EVENT_STATUS_METADATA
    ? EVENT_STATUS_METADATA[status as keyof typeof EVENT_STATUS_METADATA]
    : undefined;

export default function AdminEventsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const canMutateEvents = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  // Optimistic status overrides keyed by event ID
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, EventStatus>>({});

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [sortField, setSortField] = useState<'title' | 'startDate' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'title' | 'startDate') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', { page, search, status: statusFilter, sortField, sortOrder }],
    queryFn: () => adminGetEvents({ page, limit: 15, search, status: statusFilter, ...(sortField && { sortField }), ...(sortOrder && { sortOrder }) }),
  });

  const eventIds = (Array.isArray(data?.items) ? data?.items : []).map((e) => e._id);
  const { selectedIds, selectedCount, isSelected, toggle, selectAll, clearSelection, allSelected, indeterminate } = useBulkSelection({ pageIds: eventIds });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setDeleteTarget(null);
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status, eventVersion }: { id: string; status: EventStatus; eventVersion: number }) =>
      adminUpdateEvent(id, { status, eventVersion }),
    onMutate: ({ id, status }) => {
      // Optimistic update
      setOptimisticStatuses((prev) => ({ ...prev, [id]: status }));
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setOptimisticStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
      showToast('success', 'Event status updated');
    },
    onError: (err: any, { id }) => {
      // Rollback optimistic update
      setOptimisticStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
      showToast('error', err.response?.data?.message || 'Failed to update event status');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminBulkDeleteEvents(ids),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      clearSelection();
      const { successCount, failedCount } = data;
      if (failedCount > 0) {
        showToast('error', `Deleted ${successCount} events. ${failedCount} failed.`);
      } else {
        showToast('success', `Deleted ${successCount} events successfully.`);
      }
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'Failed to bulk delete events');
    }
  });

  const events = Array.isArray(data?.items) ? data?.items : [];
  const pagination = data?.pagination;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-20" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (events.length === 0) {
      const isFiltered = search.trim() !== '' || statusFilter !== '';
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={isFiltered ? <Search /> : <CalendarDays />}
              title={isFiltered ? "No results match your search." : "No events created yet."}
              description={isFiltered ? "Try changing your filters or search criteria." : undefined}
              action={!isFiltered ? (
                <Link href="/events/new" className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors">
                  Create Event
                </Link>
              ) : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return events.map((event) => {
      const statusMeta = getEventStatusMeta(event.status);

      return (
        <TableRow key={event._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
          <TableCell sticky="start" className="py-4 px-5">
            <Checkbox
              checked={isSelected(event._id)}
              onChange={() => toggle(event._id)}
              aria-label={`Select event ${event.title}`}
            />
          </TableCell>
          <TableCell sticky="start" stickyOffset="3rem" showStickyDivider className="py-4 px-5">
            <div className="flex items-center gap-3">
              {event.bannerImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.bannerImage.url} alt={event.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex-shrink-0 flex items-center justify-center text-accent-purple text-xs font-bold">
                  {(event.title || '?')[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-text-primary font-medium truncate max-w-52">{event.title || 'Untitled Event'}</p>
                <p className="text-text-secondary text-xs truncate">{event.slug || 'no-slug'}</p>
              </div>
            </div>
          </TableCell>
          <TableCell className="py-4 px-4 capitalize text-text-secondary">
            {event.category ? (
              event.category.replace('_', ' ')
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold animate-pulse inline-flex items-center gap-1">
                ⚠️ Missing Category
              </span>
            )}
          </TableCell>
          <TableCell className="py-4 px-4 text-text-secondary">
            {event.startDate ? (
              <div className="flex flex-col gap-0.5 text-xs">
                <div>
                  <span className="text-text-secondary">Starts:</span> {formatEventDate(event.startDate)}
                </div>
                {event.endDate && (
                  <div className="text-[11px] text-text-secondary">
                    <span className="text-text-secondary/70">Ends:</span> {formatEventDate(event.endDate)}
                  </div>
                )}
                {(event.bookingStartDate || event.bookingEndDate) && (
                  <div className="text-[10px] text-text-secondary/80 border-t border-white/5 pt-0.5 mt-0.5 flex flex-col gap-0.5">
                    {event.bookingStartDate && (
                      <div>
                        <span className="font-medium text-accent-purple-light">Book Opens:</span> {formatEventDate(event.bookingStartDate)}
                      </div>
                    )}
                    {event.bookingEndDate && (
                      <div>
                        <span className="font-medium text-accent-purple-light">Book Closes:</span> {formatEventDate(event.bookingEndDate)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-text-secondary">N/A</span>
            )}
          </TableCell>
          <TableCell className="py-4 px-4">
            {canMutateEvents && event.status ? (() => {
              const currentStatus = optimisticStatuses[event._id] ?? event.status as EventStatus;
              const currentMeta = EVENT_STATUS_METADATA[currentStatus];
              const allowedTransitions = EVENT_STATUS_TRANSITIONS[currentStatus] ?? [];
              const isPending = statusUpdateMutation.isPending && statusUpdateMutation.variables?.id === event._id;
              return (
                <select
                  id={`status-select-${event._id}`}
                  value={currentStatus}
                  disabled={isPending || allowedTransitions.length === 0}
                  onChange={(e) => {
                    const newStatus = e.target.value as EventStatus;
                    statusUpdateMutation.mutate({ id: event._id, status: newStatus, eventVersion: event.eventVersion ?? 1 });
                  }}
                  aria-label={`Change status for ${event.title}`}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium cursor-pointer bg-transparent appearance-none pr-5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
                    currentMeta?.className ?? 'border-border-subtle text-text-secondary'
                  }`}
                  style={{ backgroundImage: 'none' }}
                >
                  {/* Current status always present */}
                  <option value={currentStatus}>{currentMeta?.label ?? currentStatus}</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>
                      {EVENT_STATUS_METADATA[s]?.label ?? s}
                    </option>
                  ))}
                </select>
              );
            })() : (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                statusMeta?.className ?? 'border-border-subtle text-text-secondary'
              }`}>
                {statusMeta?.label ?? event.status?.replace('_', ' ') ?? '⚠️ Missing'}
              </span>
            )}
          </TableCell>

          <TableCell sticky="end" showStickyDivider className="py-4 px-5">
            {canMutateEvents ? (
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/events/${event._id}/edit`}
                  className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
                >
                  Edit
                </Link>

                <button
                  onClick={() => setDeleteTarget(event)}
                  className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="text-right text-text-secondary">—</div>
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Events</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {pagination?.total ?? 0} events total
          </p>
        </div>
        {canMutateEvents && (
          <Link
            href="/events/new"
            id="admin-create-event"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Create Event
          </Link>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap bg-white/5 border border-border-subtle p-1 rounded-xl gap-1">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === ''
                ? 'bg-accent-purple text-white shadow-glow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            All Statuses
          </button>
          {EVENT_STATUS_FILTER_OPTIONS.map(([value, meta]) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value as EventStatus); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === value
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="search"
            placeholder="Search events..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 transition-colors"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader stickyHeader>
            <TableRow>
              <TableHead sticky="start" className="py-3.5 px-5 w-12">
                <Checkbox
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={() => allSelected ? clearSelection() : selectAll()}
                  aria-label="Select all events on this page"
                />
              </TableHead>
              <TableHead onClick={() => handleSort('title')} className="py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none">
                Event {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4 text-text-secondary select-none">
                Category
              </TableHead>
              <TableHead onClick={() => handleSort('startDate')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Event Starts {sortField === 'startDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4 text-text-secondary select-none">
                Status
              </TableHead>

              <TableHead sticky="end" showStickyDivider className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} events
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-event-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        {deleteTarget && (
          <div>
            <h2 id="delete-event-modal-title" className="text-white font-bold text-lg mb-2">Delete Event?</h2>
            <p className="text-text-secondary text-sm mb-1">
              <strong className="text-white">{deleteTarget.title}</strong> will be permanently deleted
              along with its Cloudinary images.
            </p>
            <p className="text-error text-xs mb-5">This action cannot be undone.</p>
            {deleteMutation.error && (
              <p className="text-red-400 text-xs mb-3">{extractApiError(deleteMutation.error).message}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>



      <FloatingActionBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
      >
        <button
          onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
          disabled={bulkDeleteMutation.isPending}
          className="px-4 py-2 text-sm font-semibold bg-error/80 hover:bg-error text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
        </button>
      </FloatingActionBar>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in">
          <div className={`px-4 py-3 rounded-xl shadow-elevation-high border ${toastMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-error/10 border-error/30 text-red-400'}`}>
            {toastMessage.text}
          </div>
        </div>
      )}
    </div>
  );
}

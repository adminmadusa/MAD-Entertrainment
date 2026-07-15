'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetEvents, adminDeleteEvent, adminBulkDeleteEvents, type AdminEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { EVENT_STATUS_METADATA, type EventStatus, AdminRole } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, FloatingActionBar } from '@mad/ui';
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

  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [sortField, setSortField] = useState<'title' | 'category' | 'startDate' | 'status' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'title' | 'category' | 'startDate' | 'status') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', { page, search, status: statusFilter }],
    queryFn: () => adminGetEvents({ page, limit: 15, search, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setDeleteTarget(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminBulkDeleteEvents(ids),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setSelectedEvents(new Set());
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

  const sortedEvents = [...events].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const aStr = aVal.toLowerCase();
      const bStr = bVal.toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

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

    if (sortedEvents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-16 text-center text-text-muted">
            No events found.{' '}
            <Link href="/events/new" className="text-accent-purple hover:underline">
              Create one →
            </Link>
          </TableCell>
        </TableRow>
      );
    }

    return sortedEvents.map((event) => {
      const statusMeta = getEventStatusMeta(event.status);

      return (
        <TableRow key={event._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
          <TableCell sticky="start" className="py-4 px-5">
            <input
              type="checkbox"
              checked={selectedEvents.has(event._id)}
              onChange={(e) => {
                e.stopPropagation();
                const newSet = new Set(selectedEvents);
                if (e.target.checked) newSet.add(event._id);
                else newSet.delete(event._id);
                setSelectedEvents(newSet);
              }}
              className="w-4 h-4 rounded border-border-subtle text-accent-purple focus:ring-accent-purple/50 bg-background-card"
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
                <p className="text-text-muted text-xs truncate">{event.slug || 'no-slug'}</p>
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
              formatEventDate(event.startDate)
            ) : (
              <span className="text-text-muted">N/A</span>
            )}
          </TableCell>
          <TableCell className="py-4 px-4">
            {statusMeta ? (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            ) : event.status ? (
              <span className="text-xs px-2.5 py-1 rounded-full border font-medium border-border-subtle text-text-muted">
                {event.status.replace('_', ' ')}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold animate-pulse inline-flex items-center gap-1">
                ⚠️ Missing Status
              </span>
            )}
          </TableCell>
          <TableCell className="py-4 px-4">
            <span
              className={`text-lg ${event.isFeatured ? 'text-yellow-400' : 'text-text-muted'}`}
              title={event.isFeatured ? 'Featured Event' : 'Standard Event'}
            >
              ★
            </span>
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
                  className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="text-right text-text-muted">—</div>
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
          <p className="text-text-muted text-sm mt-0.5">
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search events..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as EventStatus | ''); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
        >
          <option value="">All Statuses</option>
          {EVENT_STATUS_FILTER_OPTIONS.map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader stickyHeader>
            <TableRow>
              <TableHead sticky="start" className="py-3.5 px-5 w-12">
                <input
                  type="checkbox"
                  checked={events.length > 0 && events.every(e => selectedEvents.has(e._id))}
                  onChange={(e) => {
                    const newSet = new Set(selectedEvents);
                    if (e.target.checked) {
                      events.forEach(ev => newSet.add(ev._id));
                    } else {
                      events.forEach(ev => newSet.delete(ev._id));
                    }
                    setSelectedEvents(newSet);
                  }}
                  className="w-4 h-4 rounded border-border-subtle text-accent-purple focus:ring-accent-purple/50 bg-background-card"
                />
              </TableHead>
              <TableHead sticky="start" stickyOffset="3rem" showStickyDivider onClick={() => handleSort('title')} className="py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none">
                Event {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('category')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Category {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('startDate')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Date {sortField === 'startDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4">Featured</TableHead>
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
        selectedCount={selectedEvents.size} 
        onClearSelection={() => setSelectedEvents(new Set())}
      >
        <button
          onClick={() => bulkDeleteMutation.mutate(Array.from(selectedEvents))}
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

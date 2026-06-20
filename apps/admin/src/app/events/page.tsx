'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { EventStatus } from '@mad/shared';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import { adminGetEvents, adminDeleteEvent, adminToggleFeatured, adminUpdateEventStatus, type AdminEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  published: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  sold_out: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

export default function AdminEventsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const canMutateEvents = !!admin?.role && ['super_admin', 'admin', 'manager'].includes(admin.role);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [confirmStatusTarget, setConfirmStatusTarget] = useState<{ id: string; title: string; previous: string; next: string } | null>(null);
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

  const featureMutation = useMutation({
    mutationFn: (id: string) => adminToggleFeatured(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminUpdateEventStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
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
        <tr key={i} className="border-b border-border-subtle/50 animate-pulse">
          <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
          <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></td>
        </tr>
      ));
    }

    if (sortedEvents.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-text-muted">
            No events found.{' '}
            <Link href="/events/new" className="text-accent-purple hover:underline">
              Create one →
            </Link>
          </td>
        </tr>
      );
    }

    return sortedEvents.map((event) => (
      <tr key={event._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <td className="py-4 px-5">
          <div className="flex items-center gap-3">
            {event.coverImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImage.url} alt={event.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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
        </td>
        <td className="py-4 px-4 capitalize text-text-secondary">
          {event.category ? (
            event.category.replace('_', ' ')
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold animate-pulse inline-flex items-center gap-1">
              ⚠️ Missing Category
            </span>
          )}
        </td>
        <td className="py-4 px-4 text-text-secondary">
          {event.startDate ? (
            new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          ) : (
            <span className="text-text-muted">N/A</span>
          )}
        </td>
        <td className="py-4 px-4">
          {event.status ? (
            canMutateEvents ? (
              <select
                value={event.status}
                onChange={(e) => {
                  const nextStatus = e.target.value;
                  if (event.status === EventStatus.PUBLISHED && (nextStatus === EventStatus.CANCELLED || nextStatus === EventStatus.DRAFT || nextStatus === EventStatus.COMPLETED)) {
                    setConfirmStatusTarget({
                      id: event._id,
                      title: event.title,
                      previous: event.status || '',
                      next: nextStatus,
                    });
                  } else {
                    statusMutation.mutate({ id: event._id, status: nextStatus });
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium bg-transparent cursor-pointer ${STATUS_COLORS[event.status] ?? ''}`}
              >
                {Object.values(EventStatus).map((s) => (
                  <option key={s} value={s} className="bg-background-card text-text-primary">{s.replace('_', ' ')}</option>
                ))}
              </select>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[event.status] ?? ''}`}>
                {event.status.replace('_', ' ')}
              </span>
            )
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold animate-pulse inline-flex items-center gap-1">
              ⚠️ Missing Status
            </span>
          )}
        </td>
        <td className="py-4 px-4">
          <button
            onClick={() => canMutateEvents && featureMutation.mutate(event._id)}
            disabled={!canMutateEvents}
            className={`text-lg transition-transform ${canMutateEvents ? 'hover:scale-110 cursor-pointer' : 'cursor-default'} ${event.isFeatured ? 'text-yellow-400' : 'text-text-muted'}`}
            title={canMutateEvents ? (event.isFeatured ? 'Remove from featured' : 'Add to featured') : undefined}
          >
            ★
          </button>
        </td>
        <td className="py-4 px-5">
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
        </td>
      </tr>
    ));
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
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
          <option value="sold_out">Sold Out</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th onClick={() => handleSort('title')} className="text-left text-text-muted font-medium py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none">
                  Event {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('category')} className="text-left text-text-muted font-medium py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                  Category {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('startDate')} className="text-left text-text-muted font-medium py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                  Date {sortField === 'startDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('status')} className="text-left text-text-muted font-medium py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                  Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Featured</th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>

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
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full"
            >
              <h3 className="text-white font-bold text-lg mb-2">Delete Event?</h3>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Confirm Modal */}
      <AnimatePresence>
        {confirmStatusTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full space-y-4"
            >
              <h3 className="text-white font-bold text-lg">Change Event Status?</h3>
              <p className="text-text-secondary text-sm">
                Are you sure you want to transition <strong className="text-white">{confirmStatusTarget.title}</strong> from <span className="capitalize font-semibold text-accent-purple">{confirmStatusTarget.previous}</span> to <span className="capitalize font-semibold text-accent-purple">{confirmStatusTarget.next}</span>?
              </p>
              {confirmStatusTarget.next === 'cancelled' && (
                <p className="text-error text-xs">Warning: Cancelling this event will prevent customers from booking tickets.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStatusTarget(null)}
                  className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    statusMutation.mutate({ id: confirmStatusTarget.id, status: confirmStatusTarget.next });
                    setConfirmStatusTarget(null);
                  }}
                  disabled={statusMutation.isPending}
                  className="flex-1 py-2.5 bg-accent-purple hover:bg-accent-purple-light rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {statusMutation.isPending ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

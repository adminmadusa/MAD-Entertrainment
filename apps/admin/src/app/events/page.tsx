'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

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
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);

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
        <Link
          href="/events/new"
          id="admin-create-event"
          className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
        >
          <span>+</span> Create Event
        </Link>
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
                <th className="text-left text-text-muted font-medium py-3.5 px-5">Event</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Category</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Date</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Status</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Featured</th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle/50 animate-pulse">
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-text-muted">
                    No events found.{' '}
                    <Link href="/events/new" className="text-accent-purple hover:underline">
                      Create one →
                    </Link>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {event.coverImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={event.coverImage.url} alt={event.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex-shrink-0 flex items-center justify-center text-accent-purple text-xs font-bold">
                            {event.title[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-text-primary font-medium truncate max-w-52">{event.title}</p>
                          <p className="text-text-muted text-xs truncate">{event.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 capitalize text-text-secondary">{event.category.replace('_', ' ')}</td>
                    <td className="py-4 px-4 text-text-secondary">
                      {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={event.status}
                        onChange={(e) => statusMutation.mutate({ id: event._id, status: e.target.value })}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium bg-transparent cursor-pointer ${STATUS_COLORS[event.status] ?? ''}`}
                      >
                        {['draft', 'published', 'cancelled', 'sold_out', 'completed'].map((s) => (
                          <option key={s} value={s} className="bg-background-card text-text-primary">{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => featureMutation.mutate(event._id)}
                        className={`text-lg transition-transform hover:scale-110 ${event.isFeatured ? 'text-yellow-400' : 'text-text-muted'}`}
                        title={event.isFeatured ? 'Remove from featured' : 'Add to featured'}
                      >
                        ★
                      </button>
                    </td>
                    <td className="py-4 px-5">
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
                    </td>
                  </tr>
                ))
              )}
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
    </div>
  );
}

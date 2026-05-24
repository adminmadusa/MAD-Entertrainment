'use client';

import { QUERY_KEYS } from '@mad/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminGetNotifications, adminRetryNotification } from '@/lib/api/admin/notification.service';

export default function AdminNotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.notifications.list({ page, channel: channelFilter, sent: statusFilter }),
    queryFn: () =>
      adminGetNotifications({
        page,
        limit: 15,
        channel: channelFilter || undefined,
        sent: statusFilter || undefined,
      }),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => adminRetryNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.notifications.all }),
  });

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Notification Log</h1>
        <p className="text-text-muted text-sm mt-0.5">
          {pagination?.total ?? 0} transmissions logged
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="push">Push Notification</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="true">Sent Successfully</option>
          <option value="false">Delivery Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">Recipient</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Channel</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Message</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Attempts</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Status</th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle/50 animate-pulse">
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-64" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-8" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-text-muted">
                    No transmission logs found.
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => (
                  <tr key={notif._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-medium text-text-primary truncate max-w-40">{notif.recipient}</div>
                      <div className="text-[10px] text-text-muted font-mono">{notif._id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-text-secondary capitalize font-medium">{notif.channel}</span>
                    </td>
                    <td className="py-4 px-4 max-w-xs text-text-secondary">
                      {notif.subject && <div className="font-semibold text-xs text-white truncate">{notif.subject}</div>}
                      <p className="text-xs truncate">{notif.body}</p>
                      {notif.failureReason && (
                        <p className="text-[10px] text-red-400 mt-1 italic truncate">
                          Error: {notif.failureReason}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      {notif.retryCount}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                        notif.isSent
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {notif.isSent ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {!notif.isSent ? (
                        <button
                          onClick={() => retryMutation.mutate(notif._id)}
                          disabled={retryMutation.isPending}
                          className="px-3 py-1.5 text-xs font-semibold btn-gradient rounded-lg text-white shadow-glow-sm hover:scale-105 transition-transform disabled:opacity-60"
                        >
                          Retry
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
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
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} notifications
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
    </div>
  );
}

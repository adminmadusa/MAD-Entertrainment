'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

import { adminGetNotifications, adminRetryNotification } from '@/lib/api/admin/notification.service';
import ErrorState from '@/components/states/ErrorState';

export default function AdminNotificationsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const canRetryNotification = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT].includes(admin.role as AdminRole);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-notifications', { page, channel: channelFilter, sent: statusFilter }],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const notifications = data?.items ?? [];
  const pagination = data?.pagination;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-32" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-64" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-8" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-12 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (notifications.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-16 text-center text-text-muted">
            No transmission logs found.
          </TableCell>
        </TableRow>
      );
    }

    return notifications.map((notif) => (
      <TableRow key={notif._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell className="py-4 px-5">
          <div className="font-medium text-text-primary truncate max-w-40">{notif.recipient}</div>
          <div className="text-[10px] text-text-muted font-mono">{notif._id}</div>
        </TableCell>
        <TableCell className="py-4 px-4">
          <span className="text-xs text-text-secondary capitalize font-medium">{notif.channel}</span>
        </TableCell>
        <TableCell className="py-4 px-4 max-w-xs text-text-secondary">
          {notif.subject && <div className="font-semibold text-xs text-white truncate">{notif.subject}</div>}
          <p className="text-xs truncate">{notif.body}</p>
          {notif.failureReason && (
            <p className="text-[10px] text-red-400 mt-1 italic truncate">
              Error: {notif.failureReason}
            </p>
          )}
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary">
          {notif.retryCount}
        </TableCell>
        <TableCell className="py-4 px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            notif.isSent
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {notif.isSent ? 'Sent' : 'Failed'}
          </span>
        </TableCell>
        <TableCell className="py-4 px-5 text-right">
          {canRetryNotification && !notif.isSent ? (
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
        </TableCell>
      </TableRow>
    ));
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load notifications.'} />
      </div>
    );
  }

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 px-5">Recipient</TableHead>
              <TableHead className="py-3.5 px-4">Channel</TableHead>
              <TableHead className="py-3.5 px-4">Message</TableHead>
              <TableHead className="py-3.5 px-4">Attempts</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
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

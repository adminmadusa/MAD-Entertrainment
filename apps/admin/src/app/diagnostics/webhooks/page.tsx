'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';

import { adminGetWebhooks } from '@/lib/api/admin/diagnostics.service';
import ErrorState from '@/components/states/ErrorState';
import { QUERY_KEYS } from '@mad/shared';

export default function WebhookDiagnosticsPage() {
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.webhooks({ page, provider: providerFilter, status: statusFilter }),
    queryFn: () => adminGetWebhooks({ 
      page, 
      limit, 
      ...(providerFilter && { provider: providerFilter }),
      ...(statusFilter && { status: statusFilter })
    }),
  });

  const webhooks = data?.data ?? [];
  const pagination = data?.pagination;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProviderFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 6 }).map((__, j) => <td key={j} className="py-4 px-4"><div className="h-3.5 bg-white/5 rounded w-20" /></td>)}
        </tr>
      ));
    }

    if (webhooks.length === 0) {
      return (
        <tr><td colSpan={6} className="py-16 text-center text-text-muted">No webhooks found.</td></tr>
      );
    }

    return webhooks.map((webhook) => {
      const bookingIdStr = typeof webhook.bookingId === 'string' 
        ? webhook.bookingId 
        : (webhook.bookingId as any)?.bookingId ?? '-';
        
      return (
        <tr key={webhook._id} className="border-b border-border-subtle/40 hover:bg-white/2">
          <td className="py-3.5 px-4 text-text-muted text-xs">
            {new Date(webhook.receivedAt).toLocaleString('en-IN')}
          </td>
          <td className="py-3.5 px-4 text-white font-medium capitalize">
            {webhook.provider}
          </td>
          <td className="py-3.5 px-4 text-text-secondary text-sm font-mono truncate max-w-[200px]" title={webhook.eventType}>
            {webhook.eventType ?? '-'}
          </td>
          <td className="py-3.5 px-4 font-mono text-xs text-accent-purple">
            {bookingIdStr}
          </td>
          <td className="py-3.5 px-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[webhook.status] ?? 'bg-white/10 text-white border-white/20'}`}>
              {webhook.status}
            </span>
          </td>
          <td className="py-3.5 px-4 text-text-secondary text-xs truncate max-w-[200px]" title={webhook.errorMessage}>
            {webhook.errorMessage ?? '-'}
          </td>
        </tr>
      );
    });
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load webhooks.'} />
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    received: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    ignored: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/diagnostics" className="text-text-muted hover:text-white transition-colors text-sm">
              Diagnostics
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <span className="text-white text-sm font-medium">Webhooks</span>
          </div>
          <h1 className="text-2xl font-black text-white">Webhook Logs</h1>
          <p className="text-text-muted text-sm mt-0.5">{pagination?.total ?? 0} total events</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={providerFilter} 
            onChange={handleProviderChange}
            className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
          >
            <option value="">All Providers</option>
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={handleStatusChange}
            className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
          >
            <option value="">All Statuses</option>
            <option value="received">Received</option>
            <option value="processing">Processing</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/30">
              <tr className="border-b border-border-subtle">
                {['Timestamp', 'Provider', 'Event Type', 'Booking ID', 'Status', 'Error Message'].map((h) => (
                  <th key={h} className="text-left text-text-muted font-medium py-3.5 px-4 whitespace-nowrap uppercase text-xs tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-background-card/50">
            <p className="text-text-muted text-xs">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-colors"
              >
                ← Prev
              </button>
              <button 
                onClick={() => setPage((p) => p + 1)} 
                disabled={page >= pagination.totalPages} 
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-colors"
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

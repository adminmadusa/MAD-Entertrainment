'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { adminGetEmailLogs } from '@/lib/api/admin/diagnostics.service';
import ErrorState from '@/components/states/ErrorState';
import { QUERY_KEYS } from '@mad/shared';

export default function EmailDiagnosticsPage() {
  const pathname = usePathname();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.emails({ page, status: statusFilter }),
    queryFn: () =>
      adminGetEmailLogs({
        page,
        limit,
        ...(statusFilter && { sent: statusFilter }),
      }),
  });

  const emails = data?.data ?? [];
  const pagination = data?.pagination;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const STATUS_COLORS: Record<string, string> = {
    queued: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    sent: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="py-4 px-4">
              <div className="h-3.5 bg-white/5 rounded w-24" />
            </td>
          ))}
        </tr>
      ));
    }

    if (emails.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-16 text-center text-text-muted">
            No email logs found.
          </td>
        </tr>
      );
    }

    return emails.map((email) => {
      // Backward compatibility: resolve status using isSent if missing
      const status = email.status ?? (email.isSent ? 'sent' : 'failed');
      const timestamp = email.queuedAt || email.createdAt;
      
      const bookingIdStr = email.bookingId?.bookingId ?? '-';
      const bookingIdLink = email.bookingId?._id ? (
        <Link
          href={`/bookings/${email.bookingId._id}`}
          className="text-accent-purple hover:underline"
        >
          {bookingIdStr}
        </Link>
      ) : (
        '-'
      );

      // Derive template name from subject or eventTitle
      const templateName = email.eventId?.title ?? email.subject ?? 'OTP Verification';

      return (
        <tr key={email._id} className="border-b border-border-subtle/40 hover:bg-white/2">
          <td className="py-3.5 px-4 text-text-muted text-xs whitespace-nowrap">
            {timestamp ? new Date(timestamp).toLocaleString('en-IN') : '-'}
          </td>
          <td className="py-3.5 px-4 text-white font-medium max-w-[180px] truncate" title={email.recipient}>
            {email.recipient}
          </td>
          <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
            {bookingIdLink}
          </td>
          <td className="py-3.5 px-4 text-text-secondary text-sm truncate max-w-[200px]" title={templateName}>
            {templateName}
          </td>
          <td className="py-3.5 px-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[status] ?? 'bg-white/10 text-white border-white/20'}`}>
              {status}
            </span>
          </td>
          <td className="py-3.5 px-4 text-text-secondary text-center text-sm">
            {email.retryCount}
          </td>
          <td className="py-3.5 px-4 text-text-secondary text-xs truncate max-w-[220px]" title={email.errorMessage}>
            {email.errorMessage ?? '-'}
          </td>
        </tr>
      );
    });
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load email logs.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/diagnostics" className="text-text-muted hover:text-white transition-colors text-sm">
              Diagnostics
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <span className="text-white text-sm font-medium">Email Logs</span>
          </div>
          <h1 className="text-2xl font-black text-white">Email Lifecycle Logs</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination?.total ?? 0} total transmissions
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
          >
            <option value="">All Statuses</option>
            <option value="true">Sent Successfully</option>
            <option value="false">Delivery Failed</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <Link
          href="/diagnostics"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname === '/diagnostics'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Consistency
        </Link>
        <Link
          href="/diagnostics/webhooks"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname.startsWith('/diagnostics/webhooks')
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Webhooks
        </Link>
        <Link
          href="/diagnostics/emails"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname.startsWith('/diagnostics/emails')
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Email Logs
        </Link>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/30">
              <tr className="border-b border-border-subtle">
                {[
                  'Timestamp',
                  'Recipient',
                  'Booking ID',
                  'Template',
                  'Status',
                  'Retries',
                  'Error Message',
                ].map((h) => (
                  <th
                    key={h}
                    className={`text-left text-text-muted font-medium py-3.5 px-4 whitespace-nowrap uppercase text-xs tracking-wider ${
                      h === 'Retries' ? 'text-center' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-background-card/50">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages}
            </p>
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

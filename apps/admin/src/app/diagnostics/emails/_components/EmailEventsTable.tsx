'use client';

import Link from 'next/link';

import type { EmailDiagnosticsRow } from '@/lib/api/admin/diagnostics.service';
import { Button, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@mad/ui';
import { Mail, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

interface EmailEventsTableProps {
  emails: EmailDiagnosticsRow[];
  isLoading: boolean;
  statusFilter: string;
  pagination?: PaginationInfo;
  page: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  sent: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const TABLE_HEADERS = [
  { label: 'Timestamp', center: false },
  { label: 'Recipient', center: false },
  { label: 'Booking ID', center: false },
  { label: 'Template', center: false },
  { label: 'Status', center: false },
  { label: 'Retries', center: true },
  { label: 'Error Message', center: false },
] as const;

export function EmailEventsTable({
  emails,
  isLoading,
  statusFilter,
  pagination,
  page,
  onPrevPage,
  onNextPage,
}: EmailEventsTableProps) {
  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j} className="py-4 px-4">
              <div className="h-3.5 bg-white/5 rounded w-24" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (emails.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="py-8">
            <EmptyState
              variant="table"
              icon={statusFilter !== '' ? <Search /> : <Mail />}
              title={statusFilter !== '' ? 'No results match your search.' : 'No email logs found.'}
              description={statusFilter !== '' ? 'Try changing your filters.' : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return emails.map((email) => {
      const status = email.status ?? (email.isSent ? 'sent' : 'failed');
      const timestamp = email.queuedAt || email.createdAt;

      const bookingIdStr = email.bookingId?.bookingId ?? '-';
      const bookingIdLink = email.bookingId?._id ? (
        <Link
          href={`/bookings?search=${bookingIdStr}`}
          className="text-accent-purple hover:underline"
        >
          {bookingIdStr}
        </Link>
      ) : (
        '-'
      );

      const templateName = email.eventId?.title ?? email.subject ?? 'OTP Verification';

      return (
        <TableRow key={email._id} className="border-b border-border-subtle/40 hover:bg-white/2">
          <TableCell className="py-3.5 px-4 text-text-muted text-xs whitespace-nowrap">
            {timestamp ? formatDateTime(timestamp) : '-'}
          </TableCell>
          <TableCell className="py-3.5 px-4 text-white font-medium max-w-[180px] truncate" title={email.recipient}>
            {email.recipient}
          </TableCell>
          <TableCell className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
            {bookingIdLink}
          </TableCell>
          <TableCell className="py-3.5 px-4 text-text-secondary text-sm truncate max-w-[200px]" title={templateName}>
            {templateName}
          </TableCell>
          <TableCell className="py-3.5 px-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                STATUS_COLORS[status] ?? 'bg-white/10 text-white border-white/20'
              }`}
            >
              {status}
            </span>
          </TableCell>
          <TableCell className="py-3.5 px-4 text-text-secondary text-center text-sm">
            {email.retryCount}
          </TableCell>
          <TableCell className="py-3.5 px-4 text-text-secondary text-xs truncate max-w-[220px]" title={email.errorMessage}>
            {email.errorMessage ?? '-'}
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col min-h-[400px]">
      <Table>
        <TableHeader className="bg-surface-hover/30">
          <TableRow>
            {TABLE_HEADERS.map((h) => (
              <TableHead
                key={h.label}
                className={`py-3.5 px-4 whitespace-nowrap uppercase text-xs tracking-wider ${
                  h.center ? 'text-center' : ''
                }`}
              >
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableBody()}</TableBody>
      </Table>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-background-card/50">
          <p className="text-text-muted text-xs">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-white"
            >
              ← Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-white"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from '@mad/ui';
import { Link2, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';
import type { WebhookDiagnosticsRow } from '@/lib/api/admin/diagnostics.service';

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

interface WebhookEventsTableProps {
  webhooks: WebhookDiagnosticsRow[];
  isLoading: boolean;
  providerFilter: string;
  statusFilter: string;
  pagination?: PaginationInfo;
  page: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  ignored: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

const TABLE_HEADERS = ['Timestamp', 'Provider', 'Event Type', 'Booking ID', 'Status', 'Error Message'] as const;

export function WebhookEventsTable({
  webhooks,
  isLoading,
  providerFilter,
  statusFilter,
  pagination,
  page,
  onPrevPage,
  onNextPage,
}: WebhookEventsTableProps) {
  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j} className="py-4 px-4">
              <div className="h-3.5 bg-white/5 rounded w-20" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (webhooks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={providerFilter !== '' || statusFilter !== '' ? <Search /> : <Link2 />}
              title={providerFilter !== '' || statusFilter !== '' ? 'No results match your search.' : 'No webhooks found.'}
              description={providerFilter !== '' || statusFilter !== '' ? 'Try changing your filters.' : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return webhooks.map((webhook) => {
      const bookingIdStr =
        typeof webhook.bookingId === 'string'
          ? webhook.bookingId
          : webhook.bookingId?.bookingId ?? '-';

      return (
        <TableRow key={webhook._id} className="border-b border-border-subtle/40 hover:bg-white/2">
          <TableCell className="py-3.5 px-4 text-text-muted text-xs">
            {formatDateTime(webhook.receivedAt)}
          </TableCell>
          <TableCell className="py-3.5 px-4 text-white font-medium capitalize">
            {webhook.provider}
          </TableCell>
          <TableCell
            className="py-3.5 px-4 text-text-secondary text-sm font-mono truncate max-w-[200px]"
            title={webhook.eventType}
          >
            {webhook.eventType ?? '-'}
          </TableCell>
          <TableCell className="py-3.5 px-4 font-mono text-xs text-accent-purple">
            {bookingIdStr}
          </TableCell>
          <TableCell className="py-3.5 px-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                STATUS_COLORS[webhook.status] ?? 'bg-white/10 text-white border-white/20'
              }`}
            >
              {webhook.status}
            </span>
          </TableCell>
          <TableCell
            className="py-3.5 px-4 text-text-secondary text-xs truncate max-w-[200px]"
            title={webhook.errorMessage}
          >
            {webhook.errorMessage ?? '-'}
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
              <TableHead key={h} className="py-3.5 px-4 whitespace-nowrap uppercase text-xs tracking-wider">
                {h}
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

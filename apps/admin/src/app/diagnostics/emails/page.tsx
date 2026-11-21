'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { EmailTemplatePreviewModal } from '@/components/diagnostics/EmailTemplatePreviewModal';
import { adminGetEmailLogs } from '@/lib/api/admin/diagnostics.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { QUERY_KEYS, AdminRole } from '@mad/shared';
import { Button, ErrorState } from '@mad/ui';
import { Eye } from '@mad/ui/icons';
import { EmailEventsTable } from './_components/EmailEventsTable';

export default function EmailDiagnosticsPage() {
  const { admin } = useAdminAuth();
  const pathname = usePathname();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const limit = 50;

  const isSuperAdmin = admin?.role === AdminRole.SUPER_ADMIN;

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.emails({ page, status: statusFilter }),
    queryFn: () =>
      adminGetEmailLogs({
        page,
        limit,
        ...(statusFilter && { sent: statusFilter }),
      }),
    enabled: isSuperAdmin,
  });

  if (admin && !isSuperAdmin) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            You do not have the required permissions to access diagnostics. Email diagnostics logs are restricted to Super Admins only.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-border-subtle transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load email logs.'} />
      </div>
    );
  }

  const emails = data?.data ?? [];
  const pagination = data?.pagination;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

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

        {/* Actions & Filters */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Templates</span>
          </Button>
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
      <EmailEventsTable
        emails={emails}
        isLoading={isLoading}
        statusFilter={statusFilter}
        pagination={pagination}
        page={page}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => p + 1)}
      />

      {/* Template Preview Modal */}
      <EmailTemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}

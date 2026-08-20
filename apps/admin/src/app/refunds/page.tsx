'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';

import { adminGetRefunds, adminProcessRefund, type AdminRefund } from '@/lib/api/admin/refund.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole, QUERY_KEYS } from '@mad/shared';
import { ErrorState, TablePagination } from '@mad/ui';

import { ProcessRefundModal } from './components/ProcessRefundModal';
import { RefundsTable } from './components/RefundsTable';

export default function AdminRefundsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [processTarget, setProcessTarget] = useState<AdminRefund | null>(null);
  const isSubmitting = useRef(false);
  const canProcessRefund = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN].includes(admin.role as AdminRole);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [gatewayId, setGatewayId] = useState('');
  const [manualOverride, setManualOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [sortField, setSortField] = useState<'amount' | 'createdAt' | 'status' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'amount' | 'createdAt' | 'status') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.refunds.list({ page, status: statusFilter, sortField, sortOrder }),
    queryFn: () => adminGetRefunds({
      page: String(page),
      limit: '15',
      ...(statusFilter && { status: statusFilter }),
      ...(sortField && { sortField }),
      ...(sortOrder && { sortOrder })
    }),
  });

  const resetStates = () => {
    setProcessTarget(null);
    setAdminNotes('');
    setGatewayId('');
    setManualOverride(false);
    setOverrideReason('');
    processMutation.reset();
  };

  const processMutation = useMutation({
    mutationFn: () => {
      isSubmitting.current = true;
      return adminProcessRefund(
        processTarget!._id,
        action,
        adminNotes,
        gatewayId,
        manualOverride,
        overrideReason
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.refunds.all });
      resetStates();
    },
    onSettled: () => {
      isSubmitting.current = false;
    },
  });

  const refunds = data?.items ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load refunds.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Refunds</h1>
          <p className="text-text-muted text-sm mt-0.5">{pagination?.total ?? 0} refund requests</p>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple">
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <RefundsTable
          refunds={refunds}
          isLoading={isLoading}
          statusFilter={statusFilter}
          canProcessRefund={canProcessRefund}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onProcess={(refund) => setProcessTarget(refund)}
        />
        {pagination && pagination.totalPages > 1 && (
          <TablePagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <ProcessRefundModal
        processTarget={processTarget}
        onClose={resetStates}
        adminRole={admin?.role}
        action={action}
        setAction={setAction}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        gatewayId={gatewayId}
        setGatewayId={setGatewayId}
        manualOverride={manualOverride}
        setManualOverride={setManualOverride}
        overrideReason={overrideReason}
        setOverrideReason={setOverrideReason}
        onConfirm={() => {
          if (isSubmitting.current) return;
          processMutation.mutate();
        }}
        isPending={processMutation.isPending}
        isError={processMutation.isError}
        errorMessage={(processMutation.error as any)?.response?.data?.message || (processMutation.error as Error)?.message}
      />
    </div>
  );
}

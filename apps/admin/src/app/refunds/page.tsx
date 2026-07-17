'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';

import { adminGetRefunds, adminProcessRefund, type AdminRefund, type AdminBooking } from '@/lib/api/admin/booking.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole, QUERY_KEYS, formatMoney } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, EmptyState, ErrorState } from '@mad/ui';
import { Receipt, Search } from '@mad/ui/icons';
import { formatDateTime, formatEventDate } from '@mad/utils';


interface PopulatedAdminRefund extends Omit<AdminRefund, 'bookingId' | 'paymentId'> {
  bookingId: AdminBooking;
  paymentId: {
    _id: string;
    amount: number;
    gateway: string;
    gatewayPaymentId?: string;
  };
}


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

  const getActionClass = (a: 'approve' | 'reject') => {
    if (action === a) {
      return a === 'approve'
        ? 'bg-green-500/20 border-green-500/50 text-green-400'
        : 'bg-red-500/20 border-red-500/50 text-red-400';
    }
    return 'glass border-border-subtle text-text-secondary';
  };

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 6 }).map((__, j) => <TableCell key={j} className="py-4 px-4"><div className="h-3.5 bg-white/5 rounded w-20" /></TableCell>)}
        </TableRow>
      ));
    }

    if (refunds.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={statusFilter !== '' ? <Search /> : <Receipt />}
              title={statusFilter !== '' ? "No results match your search." : "No refunds processed yet."}
              description={statusFilter !== '' ? "Try changing your filters." : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return refunds.map((refund) => (
      <TableRow key={refund._id} className="border-b border-border-subtle/40 hover:bg-white/2">
        <TableCell className="py-3.5 px-4 font-mono text-xs text-accent-purple">
          {(refund.bookingId as { bookingId?: string })?.bookingId ?? String(refund.bookingId).slice(-8)}
        </TableCell>
        <TableCell className="py-3.5 px-4 text-white font-semibold">{formatMoney(refund.amount, refund.currency)}</TableCell>
        <TableCell className="py-3.5 px-4 text-text-secondary max-w-40 truncate">{refund.reason ?? '—'}</TableCell>
        <TableCell className="py-3.5 px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[refund.status] ?? ''}`}>
            {refund.status}
          </span>
        </TableCell>
        <TableCell className="py-3.5 px-4 text-text-muted text-xs">{formatDateTime(refund.createdAt)}</TableCell>
        <TableCell className="py-3.5 px-4">
          {canProcessRefund && refund.status === 'requested' && (
            <button onClick={() => setProcessTarget(refund)}
              className="px-3 py-1.5 text-xs glass border border-accent-purple/30 rounded-lg text-accent-purple hover:bg-accent-purple/10 transition-all">
              Process
            </button>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load refunds.'} />
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    requested: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

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
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 px-4">Booking</TableHead>
              <TableHead onClick={() => handleSort('amount')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Amount {sortField === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4">Reason</TableHead>
              <TableHead onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('createdAt')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                Requested {sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!processTarget}
        onClose={resetStates}
        size="md"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="process-refund-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-2xl"
      >
        {processTarget && (() => {
          const target = processTarget as unknown as PopulatedAdminRefund;
          const booking = target.bookingId;
          const customer = booking?.guestInfo ?? booking?.userId;
          const event = booking?.eventId;
          const payment = target.paymentId;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[90vh]">
              {/* Context Column (Left) */}
              <div className="space-y-4 text-sm border-r border-white/5 pr-4 md:block hidden">

                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Booking ID</span>
                  <span className="text-accent-purple font-mono font-bold">{booking?.bookingId ?? '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Customer Info</span>
                  <p className="text-white font-medium">{customer?.name ?? '—'}</p>
                  <p className="text-text-secondary text-xs">{customer?.email ?? '—'}</p>
                  {customer?.phone && <p className="text-text-secondary text-xs">{customer.phone}</p>}
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Event Parameters</span>
                  <p className="text-white font-semibold">{event?.title ?? '—'}</p>
                  {event?.startDate && (
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatEventDate(event.startDate)}
                    </p>
                  )}
                  {event?.venue && <p className="text-text-muted text-xs mt-0.5">{event.venue}</p>}
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Payment / Gateway details</span>
                  <p className="text-white font-medium">{payment ? formatMoney(payment.amount, target.currency) : '—'} via <span className="uppercase text-accent-purple font-mono">{payment?.gateway ?? '—'}</span></p>
                  {payment?.gatewayPaymentId && <p className="text-text-muted font-mono text-[10px] truncate mt-0.5" title={payment.gatewayPaymentId}>ID: {payment.gatewayPaymentId}</p>}
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Requested Refund Reason</span>
                  <p className="text-text-secondary italic text-xs bg-white/3 p-2 rounded-lg mt-1">&ldquo;{processTarget.reason ?? 'No reason provided'}&rdquo;</p>
                </div>
              </div>

              {/* Action Column (Right) */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h2 id="process-refund-modal-title" className="text-white font-bold text-lg">Process Refund</h2>
                    <p className="text-text-muted text-xs">Authorize or reject refund request</p>
                  </div>

                  {booking?.ticketsScanned !== undefined && booking.ticketsScanned > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300">
                      <p className="font-semibold mb-1">⚠️ Checked-in Tickets Protection</p>
                      <p>This booking has {booking.ticketsScanned} scanned ticket(s). Approving this refund requires super_admin manual override.</p>
                    </div>
                  )}

                  {/* Mobiles-only quick summary */}
                  <div className="md:hidden block bg-white/3 rounded-xl p-3 text-xs space-y-1">
                    <p className="text-white">Booking: <span className="font-mono font-semibold text-accent-purple">{booking?.bookingId}</span></p>
                    <p className="text-white">Customer: {customer?.name}</p>
                    <p className="text-white font-medium">Amount: {formatMoney(processTarget.amount, processTarget.currency)}</p>
                    {processTarget.reason && <p className="text-text-secondary italic">Reason: &ldquo;{processTarget.reason}&rdquo;</p>}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-xs text-text-muted block">Refund Amount</span>
                    <span className="text-2xl font-black text-white">{formatMoney(processTarget.amount, processTarget.currency)}</span>
                  </div>

                  <div className="flex gap-3">
                    {(['approve', 'reject'] as const).map((a) => (
                      <button key={a} type="button" onClick={() => setAction(a)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${getActionClass(a)}`}>
                        {a}
                      </button>
                    ))}
                  </div>

                  {action === 'approve' && booking?.ticketsScanned !== undefined && booking.ticketsScanned > 0 && (
                    <div className="space-y-4 border border-white/5 bg-white/3 rounded-xl p-3">
                      {admin?.role === AdminRole.SUPER_ADMIN ? (
                        <>
                          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={manualOverride}
                              onChange={(e) => setManualOverride(e.target.checked)}
                              className="w-4 h-4 rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                            />
                            <span>Manual Override Refund Check</span>
                          </label>
                          {manualOverride && (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-xs text-text-secondary block">Override Reason *</label>
                                <textarea
                                  value={overrideReason}
                                  onChange={(e) => setOverrideReason(e.target.value)}
                                  placeholder="Provide reason for checked-in ticket override..."
                                  rows={2}
                                  className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple resize-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-text-secondary block">Gateway Refund ID *</label>
                                <input
                                  value={gatewayId}
                                  onChange={(e) => setGatewayId(e.target.value)}
                                  placeholder="e.g. rfnd_xxx from Razorpay"
                                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
                                />
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-red-400 font-medium">
                          ❌ Only super_admin accounts can override checked-in ticket bookings.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm text-text-secondary">Admin Notes</label>
                    <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for audit log..." className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
                  </div>

                  {action === 'approve' && (booking?.ticketsScanned === undefined || booking.ticketsScanned === 0) && (
                    <div className="space-y-1.5">
                      <label className="text-sm text-text-secondary">Gateway Refund ID (optional)</label>
                      <input value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} placeholder="e.g. rfnd_xxx from Razorpay" className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetStates} className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary">Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSubmitting.current) return;
                      processMutation.mutate();
                    }}
                    disabled={
                      processMutation.isPending ||
                      (action === 'approve' && booking?.ticketsScanned !== undefined && booking.ticketsScanned > 0 && (
                        admin?.role !== AdminRole.SUPER_ADMIN ||
                        !manualOverride ||
                        !overrideReason.trim() ||
                        !gatewayId.trim()
                      ))
                    }
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 ${action === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                  >
                    {processMutation.isPending ? 'Processing...' : `Confirm ${action}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

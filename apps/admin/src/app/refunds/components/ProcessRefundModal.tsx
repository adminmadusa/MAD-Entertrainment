'use client';

import React from 'react';

import type { AdminBooking } from '@/lib/api/admin/booking.service';
import type { AdminRefund } from '@/lib/api/admin/refund.service';
import { AdminRole, formatMoney } from '@mad/shared';
import { Modal } from '@mad/ui';
import { formatEventDate } from '@mad/utils';

export interface PopulatedAdminRefund extends Omit<AdminRefund, 'bookingId' | 'paymentId'> {
  bookingId: AdminBooking;
  ticketIds?: string[];
  paymentId: {
    _id: string;
    amount: number;
    gateway: string;
    gatewayPaymentId?: string;
  };
}

interface ProcessRefundModalProps {
  processTarget: AdminRefund | null;
  onClose: () => void;
  adminRole?: string;
  action: 'approve' | 'reject';
  setAction: (a: 'approve' | 'reject') => void;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  gatewayId: string;
  setGatewayId: (v: string) => void;
  manualOverride: boolean;
  setManualOverride: (v: boolean) => void;
  overrideReason: string;
  setOverrideReason: (v: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
}

export function ProcessRefundModal({
  processTarget,
  onClose,
  adminRole,
  action,
  setAction,
  adminNotes,
  setAdminNotes,
  gatewayId,
  setGatewayId,
  manualOverride,
  setManualOverride,
  overrideReason,
  setOverrideReason,
  onConfirm,
  isPending,
  isError,
  errorMessage,
}: ProcessRefundModalProps) {
  if (!processTarget) return null;

  const target = processTarget as unknown as PopulatedAdminRefund;
  const booking = target.bookingId;
  const customer = booking?.guestInfo ?? booking?.userId;
  const event = booking?.eventId;
  const payment = target.paymentId;

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const isLockedByTime = new Date(processTarget.createdAt) > threeHoursAgo;
  const hasScannedTickets = booking?.ticketsScanned !== undefined && booking.ticketsScanned > 0;
  const needsOverride = isLockedByTime || hasScannedTickets;

  const getActionClass = (a: 'approve' | 'reject') => {
    if (action === a) {
      return a === 'approve'
        ? 'bg-green-500/20 border-green-500/50 text-green-400'
        : 'bg-red-500/20 border-red-500/50 text-red-400';
    }
    return 'glass border-border-subtle text-text-secondary';
  };

  return (
    <Modal
      isOpen={!!processTarget}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="process-refund-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[90vh]">
        {/* Context Column (Left) */}
        <div className="space-y-4 text-sm border-r border-white/5 pr-4 md:block hidden">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Booking ID</span>
            <span className="text-accent-purple font-mono font-bold">{booking?.bookingId ?? '—'}</span>
            {target.ticketIds && target.ticketIds.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Selected Tickets</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {target.ticketIds.map((tid) => (
                    <span key={tid} className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-text-secondary">{tid}</span>
                  ))}
                </div>
              </div>
            )}
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

            {/* Mobiles-only quick summary */}
            <div className="md:hidden block bg-white/3 rounded-xl p-3 text-xs space-y-1">
              <p className="text-white">Booking: <span className="font-mono font-semibold text-accent-purple">{booking?.bookingId}</span></p>
              {processTarget.ticketIds && processTarget.ticketIds.length > 0 && (
                <p className="text-white">Tickets: <span className="font-mono text-text-secondary">{processTarget.ticketIds.length}</span></p>
              )}
              <p className="text-white">Customer: {customer?.name}</p>
              <p className="text-white font-medium">Amount: {formatMoney(processTarget.amount, processTarget.currency)}</p>
              {processTarget.reason && <p className="text-text-secondary italic">Reason: &ldquo;{processTarget.reason}&rdquo;</p>}
            </div>

            {hasScannedTickets && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300">
                <p className="font-semibold mb-1">⚠️ Checked-in Tickets Protection</p>
                <p>This booking has {booking.ticketsScanned} scanned ticket(s). Approving this refund requires super_admin manual override.</p>
              </div>
            )}
            {isLockedByTime && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                <p className="font-semibold mb-1">🕒 3-Hour Verification Lock</p>
                <p>This refund request was made recently. It must wait 3 hours before processing to allow for check-in sync. Approving now requires super_admin manual override.</p>
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center mt-4">
              <span className="text-xs text-text-muted block">Refund Amount</span>
              <span className="text-2xl font-black text-white">{formatMoney(processTarget.amount, processTarget.currency)}</span>
            </div>

            <div className="flex gap-3 mt-4">
              {(['approve', 'reject'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAction(a)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${getActionClass(a)}`}>
                  {a}
                </button>
              ))}
            </div>

            {action === 'approve' && needsOverride && (
              <div className="space-y-4 border border-white/5 bg-white/3 rounded-xl p-3 mt-4">
                {adminRole === AdminRole.SUPER_ADMIN ? (
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
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-text-secondary block">Override Reason *</label>
                            <span className={`text-[10px] ${overrideReason.trim().length >= 10 ? 'text-green-400' : 'text-text-muted'}`}>
                              {overrideReason.trim().length}/10 min
                            </span>
                          </div>
                          <textarea
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Provide reason for override (minimum 10 characters)..."
                            rows={2}
                            className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple resize-none"
                          />
                          {overrideReason.trim().length > 0 && overrideReason.trim().length < 10 && (
                            <p className="text-[11px] text-yellow-400">Override reason must be at least 10 characters.</p>
                          )}
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
                    ❌ Only super_admin accounts can override this security lock.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5 mt-4">
              <label className="text-sm text-text-secondary">Admin Notes</label>
              <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for audit log..." className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
            </div>
            {action === 'approve' && !needsOverride && (
              <div className="space-y-1.5 mt-4">
                <label className="text-sm text-text-secondary">Gateway Refund ID (optional)</label>
                <input value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} placeholder="e.g. rfnd_xxx from Razorpay" className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
              </div>
            )}
            {isError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 mt-4">
                <p className="font-semibold mb-0.5">Processing Failed</p>
                <p>{errorMessage || 'Failed to process refund. Please verify inputs and permissions.'}</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary">Cancel</button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  isPending ||
                  (action === 'approve' && needsOverride && (
                    adminRole !== AdminRole.SUPER_ADMIN ||
                    !manualOverride ||
                    overrideReason.trim().length < 10 ||
                    !gatewayId.trim()
                  ))
                }
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 ${action === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
              >
                {isPending ? 'Processing...' : `Confirm ${action}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import React from 'react';

import type { PopulatedAdminRefund } from './ProcessRefundModal';
import type { AdminRefund } from '@/lib/api/admin/refund.service';
import { formatMoney } from '@mad/shared';
import { formatEventDate } from '@mad/utils';

interface ProcessRefundDetailsProps {
  target: PopulatedAdminRefund;
  processTarget: AdminRefund;
}

export function ProcessRefundDetails({ target, processTarget }: ProcessRefundDetailsProps) {
  const booking = target.bookingId;
  const customer = booking?.guestInfo ?? booking?.userId;
  const event = booking?.eventId;
  const payment = target.paymentId;

  return (
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
  );
}

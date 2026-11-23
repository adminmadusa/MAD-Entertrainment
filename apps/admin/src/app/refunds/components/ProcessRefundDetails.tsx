'use client';

import React from 'react';

import { formatMoney } from '@mad/shared';
import type { AdminRefund } from '@mad/types';
import { formatEventDate } from '@mad/utils';

interface ProcessRefundDetailsProps {
  processTarget: AdminRefund;
  target?: AdminRefund;
}

export function ProcessRefundDetails({ processTarget }: ProcessRefundDetailsProps) {
  const booking = processTarget.bookingId;
  const customer = booking?.guestInfo ?? booking?.userId;
  const event = booking?.eventId;
  const payment = processTarget.paymentId;

  return (
    <div className="space-y-4 text-sm border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 pr-0 md:pr-4">
      <div>
        <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Booking ID</span>
        <span className="text-accent-purple font-mono font-bold">{booking?.bookingId ?? '—'}</span>
        {processTarget.ticketIds && processTarget.ticketIds.length > 0 && (
          <div className="mt-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Selected Tickets</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {processTarget.ticketIds.map((tid) => (
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
        <p className="text-white font-medium">{payment ? formatMoney(payment.amount, processTarget.currency) : '—'} via <span className="uppercase text-accent-purple font-mono">{payment?.gateway ?? '—'}</span></p>
        {payment?.gatewayPaymentId && <p className="text-text-muted font-mono text-[10px] truncate mt-0.5" title={payment.gatewayPaymentId}>ID: {payment.gatewayPaymentId}</p>}
      </div>

      <div>
        <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Requested Refund Reason</span>
        <p className="text-text-secondary italic text-xs bg-white/3 p-2 rounded-lg mt-1">&ldquo;{processTarget.reason ?? 'No reason provided'}&rdquo;</p>
      </div>
    </div>
  );
}

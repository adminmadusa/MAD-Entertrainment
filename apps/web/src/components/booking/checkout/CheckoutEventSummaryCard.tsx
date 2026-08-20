'use client';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { formatMoney } from '@mad/shared';
import type { Event } from '@mad/types';

interface CheckoutEventSummaryCardProps {
  event: Event;
  totalAmount: number;
  currency: string;
}

export function CheckoutEventSummaryCard({
  event,
  totalAmount,
  currency,
}: CheckoutEventSummaryCardProps) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-3.5 flex gap-3.5 items-center">
      {event.bannerImage?.url && (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-black/20 rounded-lg border border-white/10 overflow-hidden shrink-0">
          <ImageWrapper
            src={event.bannerImage.url}
            alt={event.title}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
      )}
      <div className="space-y-0.5 min-w-0 flex-1">
        <h2 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h2>
        <p className="text-[11px] text-text-muted truncate">
          {new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}{' '}
          · {event.showTime}
        </p>
        <p className="text-xs text-accent-purple-light font-bold">
          {formatMoney(totalAmount, currency)}
        </p>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { buildVenueMapLink } from '@mad/shared';
import type { Event } from '@mad/types';
import { Spinner } from '@mad/ui';

interface BookingCardQuickActionsProps {
  lifecycle: string;
  eventInfo?: Partial<Event>;
  downloading: boolean;
  resending: boolean;
  resendCooldown: number;
  onDownload: () => void;
  onResend: () => void;
}

export function BookingCardQuickActions({
  lifecycle,
  eventInfo,
  downloading,
  resending,
  resendCooldown,
  onDownload,
  onResend,
}: BookingCardQuickActionsProps) {
  if (lifecycle === 'upcoming' || lifecycle === 'live') {
    let resendContent;
    if (resending) {
      resendContent = <Spinner size="sm" aria-label="Resending tickets" />;
    } else if (resendCooldown > 0) {
      resendContent = <span className="font-mono">{resendCooldown}s</span>;
    } else {
      resendContent = (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Resend Tickets</span>
        </>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
        {eventInfo?.venue && (
          <a
            href={buildVenueMapLink(eventInfo.venue)}
            target="_blank"
            rel="noopener noreferrer"
            title="Get Directions"
            onClick={(e) => e.stopPropagation()}
            className="px-3.5 py-2 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[38px] transition-all font-semibold"
          >
            <svg className="w-3.5 h-3.5 text-accent-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Get Directions</span>
          </a>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          disabled={downloading}
          title="Download PDF"
          className="px-3.5 py-2 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[38px] transition-all disabled:opacity-50 font-semibold"
        >
          {downloading ? (
            <Spinner size="sm" aria-label="Downloading ticket" />
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-accent-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResend();
          }}
          disabled={resending || resendCooldown > 0}
          title="Resend Tickets"
          className="px-3.5 py-2 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[38px] transition-all disabled:opacity-50 font-semibold"
        >
          {resendContent}
        </button>
      </div>
    );
  }

  if (lifecycle === 'past') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
        disabled={downloading}
        className="px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white min-h-[36px] flex items-center justify-center transition-all disabled:opacity-50"
      >
        {downloading ? '...' : 'Receipt'}
      </button>
    );
  }

  return (
    <Link
      href="/contact?from=dashboard"
      onClick={(e) => e.stopPropagation()}
      className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border min-h-[36px] flex items-center justify-center transition-all ${
        lifecycle === 'cancelled'
          ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400'
          : 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300'
      }`}
    >
      Support
    </Link>
  );
}

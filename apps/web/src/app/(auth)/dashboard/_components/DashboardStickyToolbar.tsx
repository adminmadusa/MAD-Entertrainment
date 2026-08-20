import React from 'react';

import type { Booking } from '@mad/types';

interface DashboardStickyToolbarProps {
  expandedBooking: Booking;
  downloadingId: string | null;
  resendingId: string | null;
  resendCooldowns: Record<string, number>;
  onDownload: (bookingId: string) => void;
  onResend: (bookingId: string) => void;
  onShare: (bookingId: string) => void;
}

export function DashboardStickyToolbar({
  expandedBooking,
  downloadingId,
  resendingId,
  resendCooldowns,
  onDownload,
  onResend,
  onShare,
}: DashboardStickyToolbarProps) {
  const isDownloading = downloadingId === expandedBooking.bookingId;
  const isResending = resendingId === expandedBooking.bookingId;
  const cooldown = resendCooldowns[expandedBooking.bookingId] || 0;

  const getResendLabel = () => {
    if (cooldown > 0) return `${cooldown}s`;
    if (isResending) return 'Sending...';
    return 'Email';
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="toolbar"
      aria-label="Ticket quick actions"
    >
      <div className="mx-4 mb-2 glass border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Download PDF"
          disabled={isDownloading}
          onClick={() => onDownload(expandedBooking.bookingId)}
          className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold transition-all disabled:opacity-50"
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {isDownloading ? 'Saving...' : 'Download'}
        </button>

        <button
          type="button"
          aria-label="Resend ticket email"
          disabled={isResending || cooldown > 0}
          onClick={() => onResend(expandedBooking.bookingId)}
          className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold transition-all disabled:opacity-50"
        >
          {isResending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          {getResendLabel()}
        </button>

        <button
          type="button"
          aria-label="Share ticket"
          onClick={() => onShare(expandedBooking.bookingId)}
          className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl btn-gradient text-white text-[11px] font-semibold shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}

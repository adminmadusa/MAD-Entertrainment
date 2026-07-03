import type { ReactNode } from 'react';

type EventStickyCTAProps = {
  priceLabel: string;
  showDateTime: string;
  doorsOpenText: string;
  venue: string;
  scarcityStatus: ReactNode;
  availabilityText: string;
  availabilityPercent: number;
  isFavorited: boolean;
  onGetTickets: () => void;
  onToggleFavorite: () => void;
  isCompleted?: boolean;
};

export function EventStickyCTA({
  priceLabel,
  showDateTime,
  doorsOpenText,
  venue,
  scarcityStatus,
  availabilityText,
  availabilityPercent,
  isFavorited,
  onGetTickets,
  onToggleFavorite,
  isCompleted = false,
}: EventStickyCTAProps) {
  return (
    <>
      {/* ── STICKY SIDEBAR ─────────────────────────────────── */}
      <div className="hidden lg:block lg:col-span-5 self-start lg:sticky lg:top-24">
        <div className="glass rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl">
          <div>
            {isCompleted ? (
              <div className="text-2xl font-black text-text-muted mt-0.5 leading-none">
                Sales Closed
              </div>
            ) : (
              <>
                <span className="text-xs text-text-muted font-medium">Tickets from</span>
                <div className="text-3xl font-black text-accent-purple-light mt-0.5 leading-none">
                  {priceLabel}
                  <span className="text-sm font-normal text-text-muted ml-1">/ person</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2.5 text-sm text-text-secondary border-y border-white/5 py-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{showDateTime}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Doors open {doorsOpenText}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{venue}</span>
            </div>
          </div>

          {isCompleted ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Status</span>
                <span className="text-red-400 font-semibold uppercase tracking-wider">
                  Event Ended
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/5 w-0 rounded-full" />
              </div>
              <div className="text-[10px] text-text-muted">Tickets are no longer available.</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Availability</span>
                {scarcityStatus}
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-purple to-accent-pink rounded-full transition-all duration-700"
                  style={{ width: `${availabilityPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-text-muted">{availabilityText}</div>
            </div>
          )}

          {isCompleted ? (
            <button
              type="button"
              disabled
              className="w-full py-4 bg-white/5 border border-white/10 text-text-muted font-black text-sm rounded-xl cursor-not-allowed inline-flex items-center justify-center gap-2"
              aria-label="Ticket bookings closed"
            >
              Event Ended
            </button>
          ) : (
            <button
              type="button"
              onClick={onGetTickets}
              className="w-full py-4 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-[1.02] active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Get tickets
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`w-full py-3 rounded-xl border font-semibold text-sm transition-all active:scale-95 ${
              isFavorited
                ? 'border-accent-pink bg-accent-pink/10 text-accent-pink'
                : 'border-white/10 bg-white/3 hover:bg-white/8 text-white hover:border-white/20'
            }`}
          >
            {isFavorited ? '❤️ Saved to wishlist' : '♡ Add to wishlist'}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted pt-1 border-t border-white/5">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{isCompleted ? 'Ticket sales ended' : 'Secure checkout · No hidden fees'}</span>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY FOOTER ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl lg:hidden">
        <div className="container-mad max-w-7xl px-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted font-medium">Ticket status</div>
            <div className="text-base font-black text-text-muted">
              {isCompleted ? 'Sales Closed' : priceLabel}
            </div>
          </div>
          {isCompleted ? (
            <button
              type="button"
              disabled
              className="px-8 py-3.5 bg-white/5 border border-white/10 text-text-muted font-black text-sm rounded-xl cursor-not-allowed"
            >
              Event Ended
            </button>
          ) : (
            <button
              type="button"
              onClick={onGetTickets}
              className="px-8 py-3.5 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Get tickets
            </button>
          )}
        </div>
      </div>
    </>
  );
}

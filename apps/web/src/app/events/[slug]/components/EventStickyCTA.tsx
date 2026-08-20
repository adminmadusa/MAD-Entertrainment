import type { EventBookingCTA } from '@mad/types';

type EventStickyCTAProps = {
  priceLabel: string;
  onGetTickets: () => void;
  cta: EventBookingCTA;
  showDateTime?: string;
};

export function EventStickyCTA({
  priceLabel,
  onGetTickets,
  cta,
  showDateTime,
}: EventStickyCTAProps) {
  return (
    <>
      {/* ── STICKY SIDEBAR ─────────────────────────────────── */}
      <div className="hidden lg:block lg:col-span-5 self-start lg:sticky lg:top-24">
        <div className="glass rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl">
          {/* Event Date in Booking Card */}
          {showDateTime && (
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary pb-3 border-b border-white/5">
              <svg className="w-4 h-4 text-accent-purple-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{showDateTime}</span>
            </div>
          )}

          {/* Price & Action Row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {cta.action === 'NONE' ? (
                <div className="text-lg font-bold text-text-muted">
                  Sales Closed
                </div>
              ) : (
                <>
                  <span className="text-[11px] text-text-muted font-medium block">Tickets from</span>
                  <div className="text-2xl font-black text-white leading-tight">
                    {priceLabel}
                    <span className="text-xs font-normal text-text-muted ml-1">/ person</span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onGetTickets}
              disabled={cta.disabled}
              className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 ${
                cta.disabled
                  ? 'bg-white/5 border border-white/10 text-text-muted cursor-not-allowed'
                  : 'bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white shadow-glow hover:scale-[1.02] active:scale-95'
              }`}
            >
              {!cta.disabled && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              )}
              {cta.text}
            </button>
          </div>

          {/* Trust Guarantee */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted pt-2 border-t border-white/5">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{cta.action === 'NONE' ? 'Ticket sales ended' : 'Secure checkout · No hidden fees'}</span>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY FOOTER ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/10 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 shadow-2xl lg:hidden">
        <div className="container-mad max-w-7xl px-4 flex items-center justify-between gap-3">
          <div>
            {showDateTime && (
              <div className="text-[10px] text-accent-purple-light font-medium truncate max-w-[150px] sm:max-w-xs">
                {showDateTime}
              </div>
            )}
            <div className="text-xs text-text-muted font-medium">
              {cta.action === 'NONE' ? 'Status' : 'Starting from'}
            </div>
            <div className="text-sm font-black text-white">
              {cta.action === 'NONE' ? 'Sales Closed' : priceLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onGetTickets}
            disabled={cta.disabled}
            className={`px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 ${
              cta.disabled
                ? 'bg-white/5 border border-white/10 text-text-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white shadow-glow active:scale-95'
            }`}
          >
            {cta.text}
          </button>
        </div>
      </div>
    </>
  );
}

import type { EventBookingCTA } from '@mad/types';

type EventStickyCTAProps = {
  priceLabel: string;
  onGetTickets: () => void;
  cta: EventBookingCTA;
};

export function EventStickyCTA({ priceLabel, onGetTickets, cta }: EventStickyCTAProps) {
  return (
    <>
      {/* ── STICKY SIDEBAR ─────────────────────────────────── */}
      <div className="hidden lg:block lg:col-span-5 self-start lg:sticky lg:top-24">
        <div className="glass rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl">
          <div>
            {cta.action === 'NONE' ? (
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

          <button
            type="button"
            onClick={onGetTickets}
            disabled={cta.disabled}
            className={`w-full py-4 font-black text-sm rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 ${
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

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted pt-1 border-t border-white/5">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{cta.action === 'NONE' ? 'Ticket sales ended' : 'Secure checkout · No hidden fees'}</span>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY FOOTER ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl lg:hidden">
        <div className="container-mad max-w-7xl px-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted font-medium">
              {cta.action === 'NONE' ? 'Status' : 'Starting from'}
            </div>
            <div className="text-base font-black text-text-muted">
              {cta.action === 'NONE' ? 'Sales Closed' : priceLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onGetTickets}
            disabled={cta.disabled}
            className={`px-8 py-3.5 font-black text-sm rounded-xl transition-all duration-300 ${
              cta.disabled
                ? 'bg-white/5 border border-white/10 text-text-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white shadow-glow hover:scale-105 active:scale-95'
            }`}
          >
            {cta.text}
          </button>
        </div>
      </div>
    </>
  );
}

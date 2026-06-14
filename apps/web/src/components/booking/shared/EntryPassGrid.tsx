import { Ticket } from '@mad/types';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface EntryPassGridProps {
  tickets: Ticket[];
}

export function EntryPassGrid({ tickets }: EntryPassGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomedTicket, setZoomedTicket] = useState<Ticket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-track mobile carousel scroll position to update dots
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const { scrollLeft, clientWidth } = container;
      if (clientWidth > 0) {
        const children = Array.from(container.children) as HTMLElement[];
        let minDiff = Infinity;
        let matchedIndex = 0;
        children.forEach((child, idx) => {
          // Calculate distance of child relative to viewport start
          const diff = Math.abs(child.offsetLeft - scrollLeft - 16); // 16px offset padding
          if (diff < minDiff) {
            minDiff = diff;
            matchedIndex = idx;
          }
        });
        setActiveIndex(matchedIndex);
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [tickets.length]);

  // Handle Escape key to close the zoom modal
  useEffect(() => {
    if (!zoomedTicket) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedTicket(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedTicket]);

  const scrollToTicket = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        container.scrollTo({
          left: child.offsetLeft - 16,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Responsive layout: flex carousel on mobile, grid on desktop */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2 snap-x snap-mandatory scrollbar-none px-4 sm:px-0 scroll-smooth"
      >
        {tickets.map((ticket, tIndex) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: tIndex * 0.05 }}
            key={ticket._id || ticket.ticketId}
            className="min-w-[85%] sm:min-w-0 snap-center glass-strong rounded-2xl border border-border-subtle/60 overflow-hidden flex flex-col items-center p-6 text-center space-y-4 shadow-sm"
          >
            <div className="w-full pb-2 border-b border-border-subtle/40">
              <div className="text-accent-purple-light text-xs font-bold uppercase tracking-wider">
                {ticket.tierName} Entry
              </div>
              {ticket.seatId && (
                <div className="text-white font-bold text-sm mt-1">
                  Seat: <span className="font-mono">{ticket.seatId}</span> (Row {ticket.row}, Seat {ticket.seatNumber})
                </div>
              )}
              <div className="text-text-muted text-[9px] mt-1 font-mono">
                ID: {ticket.ticketId}
              </div>
            </div>

            {ticket.ticketId ? (
              <button
                type="button"
                onClick={() => setZoomedTicket(ticket)}
                className="group cursor-pointer relative overflow-hidden rounded-xl border border-white/10 hover:border-accent-purple/50 bg-white p-2 transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple"
                aria-label="Tap to enlarge QR code"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    ticket.qrCodeImage && !ticket.qrCodeImage.includes('api.qrserver.com')
                      ? ticket.qrCodeImage
                      : `/api/public/tickets/${ticket.ticketId}/qr`
                  }
                  alt="QR Ticket Code"
                  className="w-44 h-44 bg-white transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-opacity shadow-lg flex items-center gap-1">
                    🔍 Tap to Zoom
                  </span>
                </div>
              </button>
            ) : (
              <div className="w-44 h-44 bg-white/5 rounded-xl flex items-center justify-center text-text-muted text-xs">
                No QR Available
              </div>
            )}

            <div className="text-[9px] text-text-muted max-w-[200px] leading-relaxed">
              Present this QR code at the venue entry scanner for digital validation. Do not share this code.
            </div>
          </motion.div>
        ))}
      </div>

      {/* Swipe and dot indicators for mobile viewports */}
      {tickets.length > 1 && (
        <div className="flex flex-col items-center gap-2 mt-2 sm:hidden">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
            Ticket {activeIndex + 1} of {tickets.length}
          </span>
          <div className="flex justify-center gap-1.5">
            {tickets.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToTicket(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 focus:outline-none ${
                  idx === activeIndex ? 'bg-accent-purple w-3' : 'bg-white/20'
                }`}
                aria-label={`Go to ticket ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* QR Zoom Modal (Light themed, high contrast for entry scanner validation) */}
      {zoomedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedTicket(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col items-center max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setZoomedTicket(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
              aria-label="Close QR Code"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal content */}
            <div className="space-y-4 w-full">
              <div className="space-y-1">
                <span id="qr-modal-title" className="text-slate-500 font-bold text-xs uppercase tracking-wider block">
                  Entry Pass QR Code
                </span>
                <h3 className="text-slate-900 font-extrabold text-lg sm:text-xl leading-snug">
                  {zoomedTicket.tierName} Entry
                </h3>
                {zoomedTicket.seatId && (
                  <p className="text-slate-700 font-bold text-xs font-mono">
                    Seat {zoomedTicket.seatId} (Row {zoomedTicket.row}, Seat {zoomedTicket.seatNumber})
                  </p>
                )}
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 border-2 border-slate-200 rounded-2xl inline-block shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    zoomedTicket.qrCodeImage && !zoomedTicket.qrCodeImage.includes('api.qrserver.com')
                      ? zoomedTicket.qrCodeImage
                      : `/api/public/tickets/${zoomedTicket.ticketId}/qr`
                  }
                  alt="Enlarged QR Scanner Code"
                  className="w-64 h-64 mx-auto select-none pointer-events-none"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-mono">
                  ID: {zoomedTicket.ticketId}
                </p>
                <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                  Present this QR code to the venue scanner for entry. Adjust your screen brightness to maximum.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

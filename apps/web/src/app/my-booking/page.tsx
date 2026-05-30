'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicGetBookingDetails, publicDownloadTicketPDF } from '@/lib/api/public.service';
import { STORAGE_VERSION } from '@mad/shared';


function MyBookingContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [bookingRefInput, setBookingRefInput] = useState(initialRef);
  const [queryRef, setQueryRef] = useState(initialRef);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleDownloadPDF = async () => {
    if (!booking) return;
    if (downloadState === 'loading') return;
    setDownloadState('loading');
    setErrorMsg('');

    try {
      const blob = await publicDownloadTicketPDF(booking.bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAD_Ticket_${booking.bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setDownloadState('success');
      setTimeout(() => setDownloadState('idle'), 2500);
    } catch (err) {
      setDownloadState('error');
      setErrorMsg('Failed to download PDF ticket. Please try again.');
      setTimeout(() => setDownloadState('idle'), 5000);
    }
  };

  const getButtonStyles = () => {
    if (downloadState === 'loading') {
      return 'bg-accent-purple/40 text-white/60 cursor-not-allowed border border-accent-purple/20';
    }
    if (downloadState === 'success') {
      return 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-glow-green-sm';
    }
    if (downloadState === 'error') {
      return 'bg-red-500/20 text-red-400 border border-red-500/40';
    }
    return 'btn-gradient text-white shadow-glow-sm hover:scale-[1.02] active:scale-[0.98]';
  };

  const renderButtonContent = () => {
    if (downloadState === 'loading') {
      return (
        <>
          <svg className="animate-spin h-4.5 w-4.5 text-white/80" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Downloading...
        </>
      );
    }
    if (downloadState === 'success') {
      return (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Downloaded PDF!
        </>
      );
    }
    if (downloadState === 'error') {
      return (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Download Failed
        </>
      );
    }
    return (
      <>
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Ticket PDF
      </>
    );
  };

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['public-booking-details', queryRef],
    queryFn: () => {
      let sess: string | undefined;
      if (typeof window !== 'undefined') {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || undefined;
      }
      return publicGetBookingDetails(queryRef, sess);
    },
    enabled: !!queryRef,
    retry: false,
  });

  useEffect(() => {
    if (error) {
      setErrorMsg(extractApiError(error).message);
    } else {
      setErrorMsg('');
    }
  }, [error]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!bookingRefInput.trim()) {
      setErrorMsg('Please enter a booking reference ID.');
      return;
    }
    setQueryRef(bookingRefInput.trim());
  };

  const booking = result?.booking;
  const tickets = result?.tickets || [];

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white">Track Booking</h1>
          <p className="text-text-secondary text-sm">
            Retrieve your tickets and view active booking status reports.
          </p>
        </div>

        {/* Search Reference Form */}
        <form onSubmit={handleSearchSubmit} className="glass rounded-2xl border border-border-subtle p-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-grow space-y-1">
            <label className="text-[10px] text-text-secondary font-medium tracking-wider uppercase">Booking Reference ID</label>
            <input
              type="text"
              value={bookingRefInput}
              onChange={(e) => setBookingRefInput(e.target.value)}
              placeholder="e.g. MAD-2026-ABCDE"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono uppercase tracking-wider transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="sm:self-end h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-transform"
          >
            {isLoading ? 'Searching...' : 'Retrieve Tickets'}
          </button>
        </form>

        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* Booking Details Display */}
        {isLoading ? (
          <div className="text-center py-16 text-text-muted text-xs animate-pulse">
            Fetching booking details and tickets...
          </div>
        ) : booking ? (
          <div className="space-y-6">
            {/* Summary Details */}
            <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase">Event Info</span>
                  <h2 className="text-white font-bold text-lg">{booking.eventId ? (booking.eventId as any).title : 'Event Booking'}</h2>
                  {booking.eventId && (
                    <p className="text-text-muted text-xs mt-1">
                      📅 {formatDate((booking.eventId as any).startDate)} · ⏰ {(booking.eventId as any).showTime}
                    </p>
                  )}
                  {booking.eventId && (booking.eventId as any).venue && (
                    <span className="text-sm opacity-80 mt-1 block">
                      📍 {(booking.eventId as any).venue}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase">Status</span>
                  <div className={`text-xs px-2.5 py-1 rounded-full border font-bold mt-1 ${
                    booking.status === 'confirmed'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : booking.status === 'pending' || booking.status === 'awaiting_payment'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {booking.status.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/40 text-xs text-text-secondary">
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Guest Name</span>
                  <span className="text-white font-semibold">{booking.guestName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Total Tickets</span>
                  <span className="text-white font-semibold">{booking.totalTickets} Ticket(s)</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-text-muted uppercase block">Reference ID</span>
                  <span className="text-white font-mono font-bold select-all">{booking.bookingId}</span>
                </div>
              </div>

              {booking.status === 'confirmed' && (
                <div className="pt-4 border-t border-border-subtle/40 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={downloadState === 'loading'}
                    className={`w-full sm:w-auto h-10 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all select-none ${getButtonStyles()}`}
                  >
                    {renderButtonContent()}
                  </button>
                </div>
              )}
            </div>

            {/* Tickets / QR List */}
            {booking.status === 'confirmed' ? (
              <div className="space-y-6">
                <h3 className="text-white font-bold text-base">Your Tickets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((ticket, index) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      key={ticket._id}
                      className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col items-center p-6 text-center space-y-4"
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
                        <div className="text-text-muted text-[10px] mt-0.5 font-mono">
                          ID: {ticket.ticketId}
                        </div>
                      </div>

                      {ticket.qrCodeImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ticket.qrCodeImage}
                          alt="QR Ticket Code"
                          className="w-48 h-48 bg-white p-2 rounded-xl"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-white/5 rounded-xl flex items-center justify-center text-text-muted text-xs">
                          No QR Available
                        </div>
                      )}

                      <div className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
                        Present this QR code at the venue entry scanner for digital validation. Do not share this code.
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl border border-border-subtle p-8 text-center text-text-secondary text-sm">
                🎁 Tickets will be generated automatically once payment is finalized.
              </div>
            )}
          </div>
        ) : (
          queryRef && (
            <div className="text-center py-12 text-text-muted text-xs">
              No booking details resolved for reference &quot;{queryRef}&quot;.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function MyBookingPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-sm">Loading tickets details...</div>
      </div>
    }>
      <MyBookingContent />
    </Suspense>
  );
}

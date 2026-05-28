"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";

import { extractApiError } from "@/lib/api/client";
import { publicGetBookingDetails } from "@/lib/api/public.service";
import { STORAGE_VERSION } from "@mad/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: Date | string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton sub-component — shown while fetching
// ---------------------------------------------------------------------------
function BookingDetailsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Summary card skeleton */}
      <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-white/5 rounded w-16" />
            <div className="h-5 bg-white/10 rounded w-2/3" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-3 bg-white/5 rounded w-12 ml-auto" />
            <div className="h-6 bg-white/10 rounded-full w-20 ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-subtle/40">
          {[32, 20, 28, 36].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className={`h-2.5 bg-white/5 rounded w-${w}`} />
              <div className="h-4 bg-white/10 rounded w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Ticket cards skeleton */}
      <div className="space-y-3">
        <div className="h-5 bg-white/10 rounded w-28" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-border-subtle p-6 space-y-4 flex flex-col items-center"
            >
              <div className="w-full space-y-1.5">
                <div className="h-3 bg-white/10 rounded w-24 mx-auto" />
                <div className="h-4 bg-white/5 rounded w-16 mx-auto" />
              </div>
              <div className="w-56 h-56 bg-white/5 rounded-xl" />
              <div className="h-3 bg-white/5 rounded w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suspense fallback skeleton — shown before hydration
// ---------------------------------------------------------------------------
function PageSkeleton() {
  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className="h-8 bg-white/10 rounded w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-white/5 rounded w-72 mx-auto animate-pulse" />
        </div>
        <div className="glass rounded-2xl border border-border-subtle p-6 animate-pulse">
          <div className="h-10 bg-white/5 rounded-xl" />
        </div>
        <BookingDetailsSkeleton />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idle / no-query state — shown when user hasn't searched yet
// ---------------------------------------------------------------------------
function IdleState() {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-8 sm:p-12 text-center space-y-4">
      <div
        className="text-5xl"
        role="img"
        aria-label="Ticket wallet illustration"
      >
        🎫
      </div>
      <div className="space-y-2">
        <p className="text-white font-semibold text-sm">
          Enter your booking reference above
        </p>
        <p className="text-text-muted text-xs max-w-xs mx-auto leading-relaxed">
          Your reference ID was emailed to you after booking. It looks like{" "}
          <span className="font-mono text-white/60 text-[11px]">
            MAD-2026-XXXXX
          </span>
          .
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
function MyBookingContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const [bookingRefInput, setBookingRefInput] = useState(initialRef);
  const [queryRef, setQueryRef] = useState(initialRef);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-booking-details", queryRef],
    queryFn: () => {
      let sess: string | undefined;
      if (typeof window !== "undefined") {
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
      setErrorMsg("");
    }
  }, [error]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!bookingRefInput.trim()) {
      setErrorMsg("Please enter a booking reference ID.");
      return;
    }
    setQueryRef(bookingRefInput.trim());
  };

  const handleCopyRef = useCallback((ref: string) => {
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const booking = result?.booking;
  const tickets = result?.tickets || [];

  const isConfirmed = booking?.status === "confirmed";
  const isAwaitingPayment =
    booking?.status === "pending" || booking?.status === "awaiting_payment";

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background print:bg-white print:text-black print:pt-0 print:pb-0">
      <div className="container-mad max-w-3xl space-y-8 print:max-w-none print:p-0 print:m-0">
        {/* --------------------------------------------------------------- */}
        {/* Page header                                                      */}
        {/* --------------------------------------------------------------- */}
        <div className="text-center space-y-3 print:hidden">
          <h1 className="text-display-sm font-black text-white">My Tickets</h1>
          <p className="text-text-secondary text-sm">
            Retrieve your tickets and view your booking status.
          </p>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Search form                                                      */}
        {/* --------------------------------------------------------------- */}
        <form
          onSubmit={handleSearchSubmit}
          className="glass rounded-2xl border border-border-subtle p-5 sm:p-6 flex flex-col sm:flex-row gap-3 print:hidden"
        >
          <div className="flex-grow space-y-1">
            <label
              htmlFor="booking-ref-input"
              className="text-[10px] text-text-secondary font-medium tracking-wider uppercase"
            >
              Booking Reference ID
            </label>
            <input
              id="booking-ref-input"
              type="text"
              value={bookingRefInput}
              onChange={(e) => setBookingRefInput(e.target.value)}
              placeholder="e.g. MAD-2026-ABCDE"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-accent-purple"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="sm:self-end h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isLoading ? "Searching…" : "Retrieve Tickets"}
          </button>
        </form>

        {/* Error banner */}
        {errorMsg && (
          <div
            role="alert"
            className="p-4 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400 text-center print:hidden"
          >
            {errorMsg}
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Loading state                                                    */}
        {/* --------------------------------------------------------------- */}
        {isLoading && <BookingDetailsSkeleton />}

        {/* --------------------------------------------------------------- */}
        {/* Idle state (no search made yet)                                  */}
        {/* --------------------------------------------------------------- */}
        {!isLoading && !queryRef && <IdleState />}

        {/* --------------------------------------------------------------- */}
        {/* Booking details                                                  */}
        {/* --------------------------------------------------------------- */}
        {!isLoading && booking && (
          <div className="space-y-6">
            {/* ---- Confirmed success banner -------------------------------- */}
            {isConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="motion-safe:animate-none flex flex-col sm:flex-row items-center gap-4 glass rounded-2xl border border-green-500/30 bg-green-500/5 p-5 print:hidden"
              >
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-xl">
                  ✓
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-green-400 font-bold text-sm">
                    Booking Confirmed
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
                    Your tickets are ready. Present the QR codes at the venue
                    entry scanner — one per guest.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ---- Awaiting-payment guidance ------------------------------- */}
            {isAwaitingPayment && (
              <div className="flex flex-col sm:flex-row items-center gap-4 glass rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 print:hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl">
                  ⏳
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-amber-400 font-bold text-sm">
                    Payment Pending
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
                    Your booking is reserved. Complete payment to receive your
                    digital tickets. If you already paid, check back in a few
                    minutes.
                  </p>
                </div>
              </div>
            )}

            {/* ---- Summary card ------------------------------------------- */}
            <div className="glass rounded-3xl border border-border-subtle p-5 sm:p-6 space-y-4 print:hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase">
                    Event
                  </span>
                  <h2 className="text-white font-bold text-base leading-snug">
                    {booking.eventId
                      ? (booking.eventId as any).title
                      : "Event Booking"}
                  </h2>
                  {booking.eventId && (
                    <p className="text-text-muted text-xs mt-1">
                      📅 {formatDate((booking.eventId as any).startDate)} · ⏰{" "}
                      {(booking.eventId as any).showTime}
                    </p>
                  )}
                  {booking.eventId && (booking.eventId as any).venue && (
                    <p className="text-text-muted text-xs mt-0.5">
                      📍 {(booking.eventId as any).venue}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0 text-right space-y-1">
                  <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase block">
                    Status
                  </span>
                  <div
                    className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                      isConfirmed
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : isAwaitingPayment
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {booking.status.toUpperCase().replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* Meta grid — now includes total amount */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-subtle/40 text-xs text-text-secondary">
                <div>
                  <span className="text-[10px] text-text-muted uppercase block mb-0.5">
                    Guest Name
                  </span>
                  <span className="text-white font-semibold">
                    {booking.guestName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block mb-0.5">
                    Tickets
                  </span>
                  <span className="text-white font-semibold">
                    {booking.totalTickets}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block mb-0.5">
                    Total Paid
                  </span>
                  <span className="text-white font-semibold font-mono">
                    ₹{booking.totalAmount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block mb-0.5">
                    Reference ID
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(booking.bookingId)}
                    title={copied ? "Copied!" : "Copy reference to clipboard"}
                    aria-label={
                      copied
                        ? "Copied to clipboard"
                        : `Copy booking reference ${booking.bookingId}`
                    }
                    className="flex items-center gap-1 text-white font-mono font-bold hover:text-accent-purple-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded"
                  >
                    <span className="truncate max-w-[120px]">
                      {booking.bookingId}
                    </span>
                    <span
                      aria-live="polite"
                      className="text-[10px] font-sans font-normal text-text-muted flex-shrink-0"
                    >
                      {copied ? "✓" : "⎘"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Tickets / QR section ----------------------------------- */}
            {isConfirmed ? (
              <div className="space-y-4">
                {/* Section header + print action */}
                <div className="flex items-center justify-between print:hidden">
                  <h3 className="text-white font-bold text-base">
                    Your Tickets
                    <span className="ml-2 text-text-muted text-xs font-normal">
                      ({tickets.length})
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white border border-border-subtle hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    aria-label="Print or save tickets"
                  >
                    <span>🖨️</span>
                    <span>Print / Save</span>
                  </button>
                </div>

                <div id="print-ticket-area">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:flex print:flex-col print:gap-8 print:w-full">
                    {tickets.map((ticket, index) => (
                      <motion.div
                        key={ticket._id}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          delay: index * 0.07,
                          duration: 0.28,
                          ease: "easeOut",
                        }}
                        className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col items-center text-center print:bg-white print:text-black print:border-slate-300 print:shadow-none print:break-inside-avoid print:page-break-inside-avoid print:w-full print:max-w-md print:mx-auto print:my-4"
                      >
                        {/* Ticket header strip */}
                        <div className="w-full bg-white/[0.03] border-b border-border-subtle/50 px-5 py-3 space-y-1 print:bg-slate-100 print:border-slate-200 print:text-black">
                          {/* Tier pill */}
                          <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-accent-purple/15 text-accent-purple-light border border-accent-purple/25">
                              {ticket.tierName}
                            </span>
                          </div>
                          {/* Ticket number */}
                          <div className="text-[10px] text-text-muted font-medium print:text-slate-700">
                            Ticket {index + 1} of {tickets.length}
                          </div>
                          {/* Seat info (optional) */}
                          {ticket.seatId && (
                            <div className="text-white font-semibold text-xs print:text-slate-950">
                              Row {ticket.row} · Seat {ticket.seatNumber}
                              {ticket.section && ` · ${ticket.section}`}
                            </div>
                          )}
                          <div className="text-text-muted text-[10px] font-mono print:text-slate-700">
                            #{ticket.ticketId}
                          </div>
                        </div>

                        {/* QR section */}
                        <div className="flex flex-col items-center gap-3 px-5 py-5">
                          {/* "Scan at entry" label */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-text-muted uppercase print:text-slate-700">
                            <span className="w-8 h-px bg-border-subtle/60 inline-block" />
                            Scan at Entry
                            <span className="w-8 h-px bg-border-subtle/60 inline-block" />
                          </div>

                          {/* QR code */}
                          {ticket.qrCodeImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ticket.qrCodeImage}
                              alt={`QR code for ticket ${index + 1} of ${tickets.length} — ${ticket.tierName}`}
                              className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2.5 rounded-xl print:border print:border-slate-200"
                            />
                          ) : (
                            <div className="w-52 h-52 sm:w-56 sm:h-56 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 border border-border-subtle/40">
                              <span className="text-text-muted text-xs">
                                QR Unavailable
                              </span>
                              <span className="text-text-muted text-[10px] leading-relaxed text-center px-4">
                                Refresh the page or contact support if this
                                persists.
                              </span>
                            </div>
                          )}

                          {/* Scan hint */}
                          <p className="text-[10px] text-text-muted max-w-[210px] leading-relaxed print:text-slate-700">
                            One ticket per guest. Do not share this QR code.
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Post-confirmation "What to bring" guidance */}
                <div className="glass rounded-2xl border border-border-subtle p-5 space-y-3 print:hidden">
                  <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                    What to bring
                  </p>
                  <ul className="space-y-2.5 text-xs text-text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex-shrink-0"
                        role="img"
                        aria-label="Ticket"
                      >
                        🎟️
                      </span>
                      <span>
                        These QR codes — screenshot or keep this page open at
                        the venue.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex-shrink-0"
                        role="img"
                        aria-label="ID card"
                      >
                        🪪
                      </span>
                      <span>
                        A valid photo ID matching the name on your booking:{" "}
                        <span className="text-white/70 font-medium">
                          {booking.guestName}
                        </span>
                        .
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex-shrink-0"
                        role="img"
                        aria-label="Clipboard"
                      >
                        📋
                      </span>
                      <span>
                        Reference{" "}
                        <span className="font-mono text-white/70">
                          {booking.bookingId}
                        </span>{" "}
                        in case of any query at the venue.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Non-confirmed state */
              <div className="glass rounded-2xl border border-border-subtle p-8 text-center space-y-3">
                <div className="text-3xl" role="img" aria-label="Gift">
                  🎁
                </div>
                <p className="text-text-secondary text-sm font-semibold">
                  Tickets Pending
                </p>
                <p className="text-text-muted text-xs max-w-sm mx-auto leading-relaxed">
                  Your digital tickets will be generated automatically once
                  payment is confirmed. You&apos;ll see QR codes here when
                  they&apos;re ready.
                </p>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Not-found state                                                  */}
        {/* --------------------------------------------------------------- */}
        {!isLoading && !booking && queryRef && !errorMsg && (
          <div className="glass rounded-2xl border border-border-subtle p-10 text-center space-y-3">
            <div className="text-3xl" role="img" aria-label="Magnifying glass">
              🔍
            </div>
            <p className="text-white font-semibold text-sm">No booking found</p>
            <p className="text-text-muted text-xs">
              No result for reference{" "}
              <span className="font-mono text-white/60">{queryRef}</span>.
              Double-check the ID and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export with Suspense boundary
// ---------------------------------------------------------------------------
export default function MyBookingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyBookingContent />
    </Suspense>
  );
}

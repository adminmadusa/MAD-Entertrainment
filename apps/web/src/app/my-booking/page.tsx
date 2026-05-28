"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";

import { extractApiError } from "@/lib/api/client";
import { publicGetBookingDetails } from "@/lib/api/public.service";
import { STORAGE_VERSION } from "@mad/shared";

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/40">
          <div className="space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded w-16" />
            <div className="h-4 bg-white/10 rounded w-24" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded w-16" />
            <div className="h-4 bg-white/10 rounded w-12" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded w-16" />
            <div className="h-4 bg-white/10 rounded w-32" />
          </div>
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
              <div className="h-4 bg-white/10 rounded w-24" />
              <div className="w-48 h-48 bg-white/5 rounded-xl" />
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

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isConfirmed = booking?.status === "confirmed";
  const isAwaitingPayment =
    booking?.status === "pending" || booking?.status === "awaiting_payment";

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad max-w-3xl space-y-8">
        {/* ----------------------------------------------------------------- */}
        {/* Page header                                                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white">
            Track Booking
          </h1>
          <p className="text-text-secondary text-sm">
            Retrieve your tickets and view your booking status.
          </p>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Search form                                                        */}
        {/* ----------------------------------------------------------------- */}
        <form
          onSubmit={handleSearchSubmit}
          className="glass rounded-2xl border border-border-subtle p-6 flex flex-col sm:flex-row gap-3"
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
            className="p-4 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400 text-center"
          >
            {errorMsg}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Loading state                                                      */}
        {/* ----------------------------------------------------------------- */}
        {isLoading && <BookingDetailsSkeleton />}

        {/* ----------------------------------------------------------------- */}
        {/* Booking details                                                    */}
        {/* ----------------------------------------------------------------- */}
        {!isLoading && booking && (
          <div className="space-y-6">
            {/* ---- Success banner (confirmed bookings only) ---------------- */}
            {isConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-4 glass rounded-2xl border border-green-500/30 bg-green-500/5 p-5"
              >
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-2xl">
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
              <div className="flex flex-col sm:flex-row items-center gap-4 glass rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">
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
            <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4">
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

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/40 text-xs text-text-secondary">
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
                    Total Tickets
                  </span>
                  <span className="text-white font-semibold">
                    {booking.totalTickets} Ticket
                    {booking.totalTickets !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-text-muted uppercase block mb-0.5">
                    Reference ID
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(booking.bookingId)}
                    title={copied ? "Copied!" : "Copy to clipboard"}
                    className="flex items-center gap-1.5 text-white font-mono font-bold select-all hover:text-accent-purple-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded"
                  >
                    <span>{booking.bookingId}</span>
                    <span className="text-[10px] font-sans font-normal text-text-muted">
                      {copied ? "✓ Copied" : "⎘"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Tickets / QR section ----------------------------------- */}
            {isConfirmed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-base">
                    Your Tickets
                  </h3>
                  <span className="text-text-muted text-xs">
                    {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((ticket, index) => (
                    <motion.div
                      key={ticket._id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08, duration: 0.3 }}
                      className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col items-center p-6 text-center space-y-4"
                    >
                      {/* Tier header */}
                      <div className="w-full pb-3 border-b border-border-subtle/40 space-y-1">
                        <div className="text-accent-purple-light text-xs font-bold uppercase tracking-wider">
                          {ticket.tierName} Entry
                        </div>
                        {ticket.seatId && (
                          <div className="text-white font-bold text-sm">
                            Seat{" "}
                            <span className="font-mono">{ticket.seatId}</span> —
                            Row {ticket.row}, Seat {ticket.seatNumber}
                          </div>
                        )}
                        <div className="text-text-muted text-[10px] font-mono">
                          #{ticket.ticketId}
                        </div>
                      </div>

                      {/* QR code */}
                      {ticket.qrCodeImage ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ticket.qrCodeImage}
                            alt={`QR code for ticket ${ticket.ticketId}`}
                            className="w-48 h-48 bg-white p-2 rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-48 h-48 bg-white/5 rounded-xl flex items-center justify-center text-text-muted text-xs border border-border-subtle/40">
                          QR Unavailable
                        </div>
                      )}

                      {/* Scan instruction */}
                      <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
                        Show this QR code at the venue scanner. One ticket per
                        guest — do not share.
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Post-confirmation guidance */}
                <div className="glass rounded-2xl border border-border-subtle p-5 space-y-3">
                  <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                    What to bring
                  </p>
                  <ul className="space-y-2 text-xs text-text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">🎟️</span>
                      <span>
                        These QR codes — screenshot or keep this page open at
                        the venue.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">🪪</span>
                      <span>
                        A valid photo ID matching the guest name on your
                        booking.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">📋</span>
                      <span>
                        Reference ID{" "}
                        <span className="font-mono text-white/70">
                          {booking.bookingId}
                        </span>{" "}
                        in case of any query.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Non-confirmed state */
              <div className="glass rounded-2xl border border-border-subtle p-8 text-center space-y-3">
                <div className="text-3xl">🎁</div>
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

        {/* ----------------------------------------------------------------- */}
        {/* Not-found state                                                    */}
        {/* ----------------------------------------------------------------- */}
        {!isLoading && !booking && queryRef && !errorMsg && (
          <div className="text-center py-12 space-y-3">
            <div className="text-3xl">🔍</div>
            <p className="text-text-muted text-sm">
              No booking found for reference{" "}
              <span className="font-mono text-white/60">{queryRef}</span>.
            </p>
            <p className="text-text-muted text-xs">
              Double-check the reference ID and try again.
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

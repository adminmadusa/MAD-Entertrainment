'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';

import { BookingStatus, QUERY_KEYS } from '@mad/shared';
import {
  publicGetBookingDetails,
  publicDownloadTicketPDF,
  publicResendTicketEmail,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { extractApiError } from '@/lib/api/client';
import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { EntryPassGrid } from '@/components/booking/shared/EntryPassGrid';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { Event } from '@mad/types';

function BookingCardSkeleton() {
  return (
    <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border-subtle/30">
        <div className="space-y-2">
          <div className="w-24 h-2.5 bg-white/5 rounded" />
          <div className="w-48 h-6 bg-white/15 rounded" />
          <div className="w-32 h-3.5 bg-white/10 rounded" />
        </div>
        <div className="w-20 h-7 bg-white/10 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="glass-strong rounded-2xl border border-border-subtle/60 p-6 flex flex-col items-center space-y-4 animate-pulse">
      <div className="w-full pb-2 border-b border-border-subtle/40 space-y-2">
        <div className="w-20 h-3 bg-white/10 rounded mx-auto" />
        <div className="w-32 h-4 bg-white/15 rounded mx-auto" />
        <div className="w-24 h-2.5 bg-white/5 rounded mx-auto" />
      </div>
      <div className="w-44 h-44 bg-white/5 rounded-xl animate-pulse" />
      <div className="w-36 h-2.5 bg-white/5 rounded mx-auto" />
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const reference = (params?.reference as string) || '';
  const isValidReference = /^MAD-\d{4}-[A-Z0-9]{5}$/.test(reference);

  // Auth Redirect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Actions states
  const [downloading, setDownloading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const {
    data: bookingData,
    error: queryError,
    isLoading: isBookingLoading,
    isFetching: isBookingFetching,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.detail(reference),
    queryFn: () => publicGetBookingDetails(reference),
    enabled: isAuthenticated && isValidReference,
    retry: false,
  });

  // Actions implementation
  const handleDownload = async () => {
    if (!bookingData?.booking?.bookingId) return;
    try {
      setErrorMsg('');
      setInfoMsg('');
      setDownloading(true);
      const bookingId = bookingData.booking.bookingId;
      const blob = await publicDownloadTicketPDF(bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAD_Ticket_${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setInfoMsg('Ticket PDF downloaded successfully.');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to download ticket PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResend = async () => {
    if (!bookingData?.booking?.bookingId) return;
    try {
      setErrorMsg('');
      setInfoMsg('');
      setResending(true);
      const bookingId = bookingData.booking.bookingId;
      const res = await publicResendTicketEmail(bookingId);
      setInfoMsg(res.message || 'Tickets resent successfully to your email.');
      setCooldown(60);
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend tickets. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // 1. Loading state (no page spinner, detailed skeleton)
  const showLoading = isAuthLoading || !isAuthenticated || (isValidReference && isBookingLoading);
  if (showLoading) {
    return (
      <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
          <div className="space-y-4">
            <div className="w-1/3 h-8 bg-white/10 rounded animate-pulse" />
            <div className="w-1/2 h-4 bg-white/5 rounded animate-pulse" />
          </div>
          <BookingCardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TicketSkeleton />
            <TicketSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error state (if reference is invalid OR query failed OR booking doesn't exist)
  const isError = !isValidReference || !!queryError || !bookingData?.booking;
  if (isError) {
    return (
      <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
        <div 
          role="status"
          aria-live="polite"
          className="glass rounded-3xl border border-error/30 bg-error/5 p-8 text-center space-y-6 max-w-md mx-auto relative z-10"
        >
          <div className="text-4xl">⚠️</div>
          <h1 className="text-white font-bold text-lg">Booking not found.</h1>
          <p className="text-text-secondary text-xs leading-relaxed">
            Please check the booking reference and try again.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all inline-block hover:scale-[1.02] active:scale-[0.98]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { booking, tickets, ticketsReady } = bookingData;
  const eventInfo = booking.eventId as unknown as Partial<Event>;

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Decorative ambient elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span> Back to Dashboard
            </Link>
            <h1 className="text-display-sm font-black text-white tracking-tight">
              Booking Details
            </h1>
          </div>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div 
            role="status" 
            aria-live="polite" 
            className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center"
          >
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div 
            role="status" 
            aria-live="polite" 
            className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center"
          >
            {infoMsg}
          </div>
        )}

        {/* Event Banner & Detailed Info Section */}
        <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl">
          {eventInfo?.bannerImage?.url ? (
            <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-border-subtle/50">
              <Image
                src={eventInfo.bannerImage.url}
                alt={eventInfo.title || 'Event Banner'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-48 sm:h-64 rounded-2xl bg-gradient-brand flex items-center justify-center border border-border-subtle/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <span className="text-white font-black text-xl z-10 px-4 text-center">
                {eventInfo?.title || 'MAD Event'}
              </span>
            </div>
          )}

          <BookingHeaderCard 
            booking={booking} 
            isFetching={isBookingFetching} 
          />
        </div>

        {/* Ticket passes section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-white font-bold text-lg">Entry Passes</h2>
            {ticketsReady && booking.status === BookingStatus.CONFIRMED && (
              <TicketActions
                downloading={downloading}
                resending={resending}
                cooldown={cooldown}
                onDownload={handleDownload}
                onResend={handleResend}
              />
            )}
          </div>

          {/* Ticket/Pass State Render */}
          {(() => {
            if (booking.status !== BookingStatus.CONFIRMED) {
              return (
                <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                  This booking status is not confirmed. Tickets are unavailable.
                </div>
              );
            }
            if (!ticketsReady) {
              return (
                <div 
                  role="status"
                  aria-live="polite"
                  className="glass-strong rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm font-semibold">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Tickets are being prepared. Please check back shortly.
                  </div>
                </div>
              );
            }
            return <EntryPassGrid tickets={tickets} />;
          })()}
        </div>

      </div>
    </div>
  );
}

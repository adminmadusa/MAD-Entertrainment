'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { extractApiError } from '@/lib/api/client';
import {
  publicGetMyBookings,
  publicDownloadTicketPDF,
  publicResendTicketEmail,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';
import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { EntryPassGrid } from '@/components/booking/shared/EntryPassGrid';

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const targetRef = searchParams.get('ref');

  const { logout, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  // Core Retrieval States
  const [step, setStep] = useState<'email' | 'portal'>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Resend / Download States
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Transition directly to portal if already authenticated on mount
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      setStep('portal');
    }
  }, [isAuthenticated, isAuthLoading]);

  // Query Bookings (only enabled when authenticated)
  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['user-bookings'],
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });

  // ─── Actions ────────────────────────────────────────────────

  const handleDownloadPDF = async (bookingId: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setDownloadingId(bookingId);

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
      setDownloadingId(null);
    }
  };

  const handleResendTickets = async (bookingId: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setResendingId(bookingId);

      const res = await publicResendTicketEmail(bookingId);
      setInfoMsg(res.message || 'Tickets resent successfully to your email.');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend tickets. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  const handleExitPortal = () => {
    logout();
    setStep('email');
    setErrorMsg('');
    setInfoMsg('');
  };



  const bookings = bookingsData?.bookings || [];
  const tickets = bookingsData?.tickets || [];

  const sortedBookings = [...bookings].sort((a, b) => {
    if (targetRef && a.bookingId === targetRef) return -1;
    if (targetRef && b.bookingId === targetRef) return 1;
    return 0;
  });

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            {step === 'portal' ? 'My Ticket Wallet' : 'Retrieve Tickets'}
          </h1>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
            {step === 'portal'
              ? `Manage and view entry passes associated with ${user?.email || 'your email'}.`
              : targetRef 
                ? `Verify the email address used to book ${targetRef} to view your tickets.`
                : 'Enter your email address to verify your identity and instantly track your active event bookings.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in zoom-in duration-300">
            {infoMsg}
          </div>
        )}

        {/* SCREEN 1 & 2: Reusable Shared AuthForm Gate */}
        {step !== 'portal' && (
          <div className="max-w-md mx-auto glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
            <AuthForm mode="wallet" onSuccess={() => setStep('portal')} />
          </div>
        )}

        {/* SCREEN 3: Consolidated Bookings Portal Dashboard */}
        {step === 'portal' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            
            {/* Header Control */}
            <div className="flex justify-between items-center bg-white/5 border border-border-subtle/50 px-6 py-4 rounded-2xl">
              <div className="text-left">
                <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Active Session</span>
                <p className="text-white text-xs font-semibold">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleExitPortal}
                className="text-xs px-4 py-2 bg-white/10 hover:bg-white/15 border border-border-subtle rounded-xl text-text-primary font-semibold transition-all"
              >
                Log Out
              </button>
            </div>

            {isBookingsLoading ? (
              <div className="text-center py-20 text-text-muted text-xs animate-pulse">
                Loading secure ticket resources...
              </div>
            ) : sortedBookings.length > 0 ? (
              <div className="space-y-8">
                {sortedBookings.map((booking) => {
                  const bookingTickets = tickets.filter(
                    (t) => t.bookingId === booking._id || t.bookingId?.toString() === booking._id?.toString()
                  );

                  const isTarget = targetRef && booking.bookingId === targetRef;
                  const containerClasses = isTarget
                    ? "glass rounded-3xl p-6 sm:p-8 space-y-6 shadow-glow-purple transition-all duration-300 border-accent-purple ring-2 ring-accent-purple/50"
                    : "glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl transition-all duration-300 hover:border-white/10";

                  return (
                    <div
                      key={booking._id}
                      className={containerClasses}
                    >
                      <BookingHeaderCard booking={booking} />

                      {/* Tickets list for confirmed bookings */}
                      {booking.status === 'confirmed' ? (
                        <div className="space-y-4 pt-4 border-t border-border-subtle/30">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                            <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                            <TicketActions
                              downloading={downloadingId === booking.bookingId}
                              resending={resendingId === booking.bookingId}
                              onDownload={() => handleDownloadPDF(booking.bookingId)}
                              onResend={() => handleResendTickets(booking.bookingId)}
                            />
                          </div>
                          <EntryPassGrid tickets={bookingTickets} />
                        </div>
                      ) : (
                        <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                          🎁 Entry tickets and QR scanner codes will be generated automatically once your payment is successfully completed.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass rounded-3xl border border-border-subtle p-16 text-center space-y-4">
                <div className="text-4xl">🎫</div>
                <h3 className="text-white font-bold text-base">No Tickets Found</h3>
                <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                  {targetRef ? (
                    <>
                      We couldn't find the booking <span className="text-white font-semibold">{targetRef}</span> associated with <span className="text-white font-semibold">{user?.email}</span>. Did you use a different email address at checkout?
                    </>
                  ) : (
                    <>
                      We couldn't find any confirmed event bookings associated with the email <span className="text-white font-semibold">{user?.email}</span>.
                    </>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleExitPortal}
                    className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Try Another Email
                  </button>
                  <a
                    href="mailto:support@mad-entertainment.com"
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-border-subtle"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TicketRetrievalPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-purple-300 animate-pulse text-sm">Loading Ticket Wallet...</div>
      </div>
    }>
      <TicketRetrievalContent />
    </Suspense>
  );
}

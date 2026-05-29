'use client';

import { Button } from '@mad/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestMagicLink,
  publicVerifyMagicLinkOrOTP,
  publicGetMyBookings,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';

function TicketRetrievalContent() {
  const router = useRouter();
  const { login, logout, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  // Core Retrieval States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'portal'>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Resend code countdown timer
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Transition directly to portal if already authenticated on mount
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      setStep('portal');
    }
  }, [isAuthenticated, isAuthLoading]);

  // Start timer for resending passcode
  const startTimer = useCallback(() => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Queries & Mutations ────────────────────────────────────

  // Request Passcode Email
  const requestMagicLinkMutation = useMutation({
    mutationFn: () => publicRequestMagicLink(email),
    onSuccess: (res) => {
      setStep('otp');
      setInfoMsg(res.message || 'Verification passcode dispatched. Please check your inbox.');
      setErrorMsg('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to send verification code. Please try again.');
    },
  });

  // Verify OTP Passcode
  const verifyMutation = useMutation({
    mutationFn: (cleanOtp: string) =>
      publicVerifyMagicLinkOrOTP({
        otp: cleanOtp,
        email: email,
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      setStep('portal');
      setErrorMsg('');
      setOtp('');
      setInfoMsg('');
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Invalid or expired passcode. Please request a new code.');
    },
  });

  // Query Bookings (only enabled when authenticated)
  const { data: bookingsData, isLoading: isBookingsLoading, refetch } = useQuery({
    queryKey: ['user-bookings'],
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });

  // ─── Actions ────────────────────────────────────────────────

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    requestMagicLinkMutation.mutate();
  };

  const handleSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanOtp = otp.trim().replace(/\s/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit passcode.');
      return;
    }
    verifyMutation.mutate(cleanOtp);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitized);
  };

  const handleBackToEmail = () => {
    setStep('email');
    setErrorMsg('');
    setInfoMsg('');
    setOtp('');
  };

  const handleExitPortal = () => {
    logout();
    setStep('email');
    setEmail('');
    setOtp('');
    setErrorMsg('');
    setInfoMsg('');
  };

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const bookings = bookingsData?.bookings || [];
  const tickets = bookingsData?.tickets || [];

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

        {/* SCREEN 1: Request OTP / Email Form */}
        {step === 'email' && (
          <div className="max-w-md mx-auto glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
            <form onSubmit={handleSubmitEmail} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
                isLoading={requestMagicLinkMutation.isPending}
              >
                Continue with Email
              </Button>
            </form>
          </div>
        )}

        {/* SCREEN 2: Verify OTP Passcode Form */}
        {step === 'otp' && (
          <div className="max-w-md mx-auto glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
            <form onSubmit={handleSubmitOtp} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1 block text-center">
                  6-Digit Passcode
                </label>
                
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  onPaste={handlePaste}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-black bg-white/5 border border-border-subtle rounded-2xl py-4 text-white placeholder:text-text-muted/15 focus:outline-none focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/60 transition-all duration-300 tracking-[0.6em] pl-[0.6em] font-mono"
                />
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
                  isLoading={verifyMutation.isPending}
                >
                  Verify Passcode
                </Button>

                <div className="flex justify-between items-center text-xs px-1 pt-1">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="text-text-muted hover:text-white transition-colors duration-200"
                  >
                    ← Back to Email
                  </button>

                  {resendTimer > 0 ? (
                    <span className="text-text-muted/60">
                      Resend code in <span className="font-semibold text-purple-300">{resendTimer}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestMagicLinkMutation.mutate()}
                      disabled={requestMagicLinkMutation.isPending}
                      className="text-accent-purple hover:text-accent-purple-light font-semibold transition-colors duration-200 disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            </form>
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
            ) : bookings.length > 0 ? (
              <div className="space-y-8">
                {bookings.map((booking) => {
                  const bookingTickets = tickets.filter(
                    (t) => t.bookingId === booking._id || t.bookingId?.toString() === booking._id?.toString()
                  );

                  return (
                    <div
                      key={booking._id}
                      className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl transition-all duration-300 hover:border-white/10"
                    >
                      {/* Booking Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border-subtle/30">
                        <div>
                          <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase">Event Info</span>
                          <h2 className="text-white font-bold text-xl mt-0.5">
                            {booking.eventId ? (booking.eventId as any).title : 'Event Booking'}
                          </h2>
                          {booking.eventId && (
                            <p className="text-text-muted text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                              <span>📅 {formatDate((booking.eventId as any).startDate)}</span>
                              <span>⏰ {(booking.eventId as any).showTime}</span>
                            </p>
                          )}
                          {booking.eventId && (booking.eventId as any).venue && (
                            <span className="text-sm opacity-80 mt-1 block">
                              📍 {(booking.eventId as any).venue}
                            </span>
                          )}
                        </div>
                        <div className="sm:text-right self-start sm:self-center">
                          <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase block sm:mb-1">Status</span>
                          <div className={`text-xs px-3 py-1 rounded-full border font-black inline-block ${
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

                      {/* Guest info metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-text-secondary">
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

                      {/* Tickets list for confirmed bookings */}
                      {booking.status === 'confirmed' ? (
                        <div className="space-y-4 pt-4 border-t border-border-subtle/30">
                          <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bookingTickets.map((ticket, tIndex) => (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: tIndex * 0.05 }}
                                key={ticket._id}
                                className="glass-strong rounded-2xl border border-border-subtle/60 overflow-hidden flex flex-col items-center p-6 text-center space-y-4 shadow-sm"
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

                                {ticket.qrCodeImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={ticket.qrCodeImage}
                                    alt="QR Ticket Code"
                                    className="w-44 h-44 bg-white p-2 rounded-xl"
                                  />
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
                  We couldn't find any confirmed event bookings associated with the email <span className="text-white font-semibold">{user?.email}</span>.
                </p>
                <button
                  type="button"
                  onClick={handleExitPortal}
                  className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  Try Another Email
                </button>
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

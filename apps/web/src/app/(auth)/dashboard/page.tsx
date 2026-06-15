'use client';

import { BookingStatus, QUERY_KEYS } from '@mad/shared';
import type { Booking, Event } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';

import { EntryPassGrid } from '@/components/booking/shared/EntryPassGrid';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { extractApiError } from '@/lib/api/client';
import {
  publicGetMyBookings,
  publicDownloadTicketPDF,
  publicResendTicketEmail,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';

function BookingCardSkeleton() {
  return (
    <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div className="space-y-2 flex-grow">
          <div className="w-1/3 h-4 bg-white/10 rounded" />
          <div className="w-1/4 h-3 bg-white/5 rounded" />
        </div>
        <div className="w-16 h-6 bg-white/10 rounded-full" />
      </div>
      <div className="w-full h-8 bg-white/5 rounded" />
    </div>
  );
}

const TOP_FAQS = [
  {
    q: 'How do I access my tickets?',
    a: "All active tickets are displayed under the 'My Tickets' tab. Simply tap any event row to expand it, view the entry pass QR codes, or download the PDF.",
  },
  {
    q: 'Can I get a refund for my booking?',
    a: "Refund eligibility depends on the specific event policy. In general, tickets are non-refundable unless the event is cancelled. Please check the event page or refer to our <a href='/legal/refunds' class='text-accent-purple hover:underline font-semibold'>Refund Policy</a>.",
  },
  {
    q: "What if I didn't receive my confirmation email?",
    a: "Ensure you are logged in with the same email used during purchase. Expand the event row under 'My Tickets' and click 'Resend Email' to trigger a manual dispatch.",
  },
];

type TabType = 'tickets' | 'account' | 'support';

function DashboardContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab and Expand states
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Action states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Auth Redirect check
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Sync tab & reference from query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    const refParam = searchParams.get('ref');

    if (tabParam && ['tickets', 'account', 'support'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (refParam) {
      setExpandedBookingId(refParam);
      setActiveTab('tickets');
    }
  }, [searchParams]);

  // Auto-scroll expanded accordion into view
  useEffect(() => {
    if (activeTab === 'tickets' && expandedBookingId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`booking-accordion-${expandedBookingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [expandedBookingId, activeTab]);

  // Update tab in URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  // Cooldown timers
  useEffect(() => {
    const keys = Object.keys(resendCooldowns);
    if (keys.length === 0) return;

    const timer = setInterval(() => {
      setResendCooldowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const k of Object.keys(next)) {
          if (next[k] > 0) {
            next[k] -= 1;
            changed = true;
          } else {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldowns]);

  // Fetch all bookings
  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.mine(),
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });

  const bookings = bookingsData?.bookings || [];
  const tickets = bookingsData?.tickets || [];

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
      setResendCooldowns((prev) => ({ ...prev, [bookingId]: 60 }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend tickets. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  const showSkeleton = isAuthLoading || !isAuthenticated;
  const userName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account User';
  const userPhone = user?.mobileNumber || user?.phone || 'Not Provided';
  const userEmail = user?.email || 'N/A';

  const renderTicketsTab = () => {
    if (isBookingsLoading) {
      return (
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      );
    }

    if (bookingsError) {
      return (
        <div className="glass rounded-3xl border border-error/30 bg-error/5 p-8 text-center space-y-4">
          <div className="text-2xl">⚠️</div>
          <h4 className="text-red-400 font-bold">Failed to load tickets</h4>
          <p className="text-text-secondary text-xs max-w-sm mx-auto">
            We encountered an issue retrieving your ticket records. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    if (bookings.length > 0) {
      const now = new Date();
      const upcomingBookings = bookings.filter((b) => {
        const eventInfo = b.eventId as unknown as Partial<Event>;
        const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
        if (b.status !== BookingStatus.CONFIRMED) return false;
        if (!startDate) return true;
        return startDate >= now;
      });

      const pastBookings = bookings.filter((b) => {
        const eventInfo = b.eventId as unknown as Partial<Event>;
        const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
        if (b.status !== BookingStatus.CONFIRMED) return true;
        if (!startDate) return false;
        return startDate < now;
      });

      const renderBookingAccordion = (booking: Booking, isPast = false) => {
        const isExpanded = expandedBookingId === booking.bookingId;
        const bookingTickets = tickets.filter(
          (t) => t.bookingId === booking._id || t.bookingId?.toString() === booking._id?.toString()
        );
        const bookingTicketsReady =
          bookingsData?.ticketsReadyMap?.[booking._id?.toString() ?? ''] ?? false;

        const eventInfo = booking.eventId as unknown as Partial<Event>;

        return (
          <div
            key={booking._id}
            id={`booking-accordion-${booking.bookingId}`}
            className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${
              isExpanded
                ? 'border-accent-purple shadow-glow-purple/10 bg-white/[0.02]'
                : 'border-white/5 hover:border-white/10'
            } ${isPast ? 'opacity-75' : ''}`}
          >
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setExpandedBookingId(isExpanded ? null : booking.bookingId)}
              className="w-full text-left p-5 flex items-center justify-between gap-4 focus:outline-none"
            >
              <div className="space-y-1 flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-bold text-base sm:text-lg leading-snug">
                    {eventInfo?.title || 'Event Booking'}
                  </h3>
                  {booking.status !== BookingStatus.CONFIRMED && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold uppercase tracking-wider">
                      {booking.status}
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-xs flex flex-wrap gap-x-3 gap-y-1">
                  {eventInfo?.startDate && (
                    <span>📅 {new Date(eventInfo.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  )}
                  <span>🎟️ {booking.totalTickets} Ticket(s)</span>
                  <span className="font-mono text-[10px] text-text-muted/70">Ref: {booking.bookingId}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-text-secondary text-sm transition-transform duration-300"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Accordion Content */}
            {isExpanded && (
              <div className="px-5 pb-6 pt-2 border-t border-white/5 space-y-5 animate-in fade-in duration-200">
                {/* Compact Metadata Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-white/5 text-xs text-text-secondary">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Guest</span>
                    <span className="text-white font-semibold">{booking.guestName}</span>
                  </div>
                  {eventInfo?.venue && (
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider block">Venue</span>
                      <span className="text-white font-semibold">{eventInfo.venue}</span>
                    </div>
                  )}
                  {eventInfo?.showTime && (
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider block">Time</span>
                      <span className="text-white font-semibold">{eventInfo.showTime}</span>
                    </div>
                  )}
                </div>

                {booking.status === BookingStatus.CONFIRMED ? (
                  <div className="space-y-4 pt-2 border-t border-border-subtle/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                      <h4 className="text-white font-bold text-sm">Entry Passes</h4>
                      <div className="flex flex-wrap gap-2">
                        {bookingTicketsReady && (
                          <TicketActions
                            downloading={downloadingId === booking.bookingId}
                            resending={resendingId === booking.bookingId}
                            cooldown={resendCooldowns[booking.bookingId] || 0}
                            onDownload={() => handleDownloadPDF(booking.bookingId)}
                            onResend={() => handleResendTickets(booking.bookingId)}
                          />
                        )}
                      </div>
                    </div>

                    {!bookingTicketsReady ? (
                      <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-accent-purple-light text-sm font-semibold">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Generating your tickets...
                        </div>
                        <p className="text-text-muted text-xs">Your entry passes will appear here shortly.</p>
                      </div>
                    ) : (
                      <EntryPassGrid tickets={bookingTickets} />
                    )}
                  </div>
                ) : (
                  <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                    Tickets are unavailable as the booking is not confirmed.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      };

      return (
        <div className="space-y-6">
          {upcomingBookings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider opacity-60 pl-1">Upcoming Tickets</h2>
              <div className="space-y-4">
                {upcomingBookings.map((b) => renderBookingAccordion(b, false))}
              </div>
            </div>
          )}

          {pastBookings.length > 0 && (
            <div className="space-y-3 pt-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider opacity-60 pl-1">Past Tickets</h2>
              <div className="space-y-4">
                {pastBookings.map((b) => renderBookingAccordion(b, true))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="glass rounded-3xl border border-border-subtle p-12 text-center space-y-4">
        <div className="text-4xl">🎟️</div>
        <h4 className="text-white font-bold text-base">No tickets found</h4>
        <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
          You don't have any bookings yet. Once you book tickets for events, they will appear here automatically.
        </p>
        <div className="pt-2">
          <Link
            href="/events"
            className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  };

  const renderAccountTab = () => {
    return (
      <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Decorative Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-[100px] pointer-events-none" />

        <div className="flex items-center gap-4">
          {user?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={userName}
              className="w-16 h-16 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-2xl font-black shadow-glow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-white font-bold text-xl">Account Details</h2>
            <p className="text-text-secondary text-xs mt-1">Manage your profile and linked contact details</p>
          </div>
        </div>

        <div className="border-t border-border-subtle/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Email Address</span>
            <span className="text-white font-semibold">{userEmail}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Phone Number</span>
            <span className="text-white font-semibold">{userPhone}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Member Since</span>
            <span className="text-text-muted font-semibold italic">Coming Soon</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Account Type</span>
            <span className="text-white font-semibold capitalize">
              {user?.isGuest ? 'Guest Account' : 'Registered Member'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSupportTab = () => {
    return (
      <div className="space-y-6">
        {/* Support hub card */}
        <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
          <h2 className="text-white font-bold text-xl">Need Assistance?</h2>
          <p className="text-text-secondary text-sm max-w-lg">
            Have questions about your booking, payment queries, or event logistics? Check out our quick answers below or contact our team directly.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
            >
              Contact Support
            </Link>
            <Link
              href="/support"
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all inline-block"
            >
              Support Hub
            </Link>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider opacity-60 pl-1">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {TOP_FAQS.map((faq, idx) => (
              <div key={idx} className="glass p-5 rounded-2xl border border-white/5 space-y-2">
                <h4 className="text-white font-bold text-sm sm:text-base">{faq.q}</h4>
                {/* eslint-disable-next-line react/no-danger */}
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-text-secondary text-sm">
            Access your secure entry tickets, manage your details, and get support.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300">
            {infoMsg}
          </div>
        )}

        {showSkeleton ? (
          <div className="space-y-8">
            <div className="w-full h-12 bg-white/10 rounded-2xl animate-pulse" />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stateful Glassmorphic Segmented Control Tab Bar */}
            <div className="glass p-1.5 rounded-2xl border border-white/5 flex gap-1 w-full sm:w-max">
              <button
                type="button"
                onClick={() => handleTabChange('tickets')}
                className={`flex-grow sm:flex-grow-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 ${
                  activeTab === 'tickets'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                🎟️ My Tickets
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('account')}
                className={`flex-grow sm:flex-grow-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 ${
                  activeTab === 'account'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                👤 Account Details
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('support')}
                className={`flex-grow sm:flex-grow-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 ${
                  activeTab === 'support'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                ❓ Help & Support
              </button>
            </div>

            {/* Active Tab View */}
            <div className="space-y-6">
              {activeTab === 'tickets' && renderTicketsTab()}
              {activeTab === 'account' && renderAccountTab()}
              {activeTab === 'support' && renderSupportTab()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-purple-300 animate-pulse text-sm">Loading Dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

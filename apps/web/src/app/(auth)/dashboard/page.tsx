'use client';

import { BookingStatus } from '@mad/shared';
import type { Event } from '@mad/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';

import { BookingCard } from '@/components/booking/shared/BookingCard';
import { useBookings } from '@/hooks/use-bookings.hook';
import { useAuth } from '@/providers/AuthProvider';
import { ProfileCompletionForm } from '@/components/auth/ProfileCompletionForm';
import { ProfileEditor } from '@/components/account/ProfileEditor';

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
  const { user, isAuthenticated, isLoading: isAuthLoading, onboardingRequired, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab and Expand states
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [activeTicketSubTab, setActiveTicketSubTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  // Consume SSOT hook for booking retrieval and actions
  const {
    bookings,
    tickets,
    ticketsReadyMap,
    isLoading: isBookingsLoading,
    isError: bookingsError,
    refetch,
    downloadingId,
    resendingId,
    resendCooldowns,
    errorMsg,
    infoMsg,
    setErrorMsg,
    setInfoMsg,
    handleDownloadPDF,
    handleResendTickets,
    upcomingBookings,
    pastBookings,
    cancelledBookings,
  } = useBookings();

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

  // Share handler: navigator.share primary, clipboard fallback, AbortError silenced
  const handleShare = async (bookingId: string) => {
    const shareUrl = `${window.location.origin}/dashboard?ref=${bookingId}`;
    try {
      setErrorMsg('');
      setInfoMsg('');
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'MAD Entertrainment — My Ticket',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setInfoMsg('Link copied to clipboard.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setInfoMsg('Link copied to clipboard.');
      } catch {
        // clipboard unavailable — fail silently
      }
    }
  };

  const showSkeleton = isAuthLoading || !isAuthenticated;
  const userName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account User';

  // Quick stats: derived from existing bookings data, no extra API calls
  const upcomingCount = useMemo(() => {
    const quickStatsNow = new Date();
    return bookings.filter((b) => {
      const eventInfo = b.eventId as unknown as Partial<Event>;
      const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
      if (b.status !== BookingStatus.CONFIRMED) return false;
      if (!startDate) return true;
      return startDate >= quickStatsNow;
    }).length;
  }, [bookings]);

  // Sticky bar guard: only when confirmed booking expanded AND tickets ready
  const expandedBooking = useMemo(() => {
    return expandedBookingId
      ? bookings.find((b) => b.bookingId === expandedBookingId) ?? null
      : null;
  }, [expandedBookingId, bookings]);

  const stickyBarVisible = useMemo(() => {
    return (
      expandedBooking !== null &&
      expandedBooking.status === BookingStatus.CONFIRMED &&
      (ticketsReadyMap[expandedBooking._id?.toString() ?? ''] ?? false)
    );
  }, [expandedBooking, ticketsReadyMap]);

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

    let subTabBookings = upcomingBookings;
    if (activeTicketSubTab === 'past') {
      subTabBookings = pastBookings;
    } else if (activeTicketSubTab === 'cancelled') {
      subTabBookings = cancelledBookings;
    }

    let emptyMessage = "You don't have any cancelled or refunded bookings.";
    if (activeTicketSubTab === 'upcoming') {
      emptyMessage = "You don't have any upcoming event bookings.";
    } else if (activeTicketSubTab === 'past') {
      emptyMessage = "You don't have any past event history.";
    }

    const renderSubTabs = () => {
      return (
        <div
          className="glass p-1.5 rounded-2xl border border-white/5 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none w-full mb-6"
          role="tablist"
          aria-label="Ticket categories"
        >
          <button
            type="button"
            role="tab"
            id="subtab-upcoming"
            aria-selected={activeTicketSubTab === 'upcoming'}
            aria-controls="subtab-panel-upcoming"
            onClick={() => setActiveTicketSubTab('upcoming')}
            className={`flex-shrink-0 px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
              activeTicketSubTab === 'upcoming'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            type="button"
            role="tab"
            id="subtab-past"
            aria-selected={activeTicketSubTab === 'past'}
            aria-controls="subtab-panel-past"
            onClick={() => setActiveTicketSubTab('past')}
            className={`flex-shrink-0 px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
              activeTicketSubTab === 'past'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Past Events ({pastBookings.length})
          </button>
          <button
            type="button"
            role="tab"
            id="subtab-cancelled"
            aria-selected={activeTicketSubTab === 'cancelled'}
            aria-controls="subtab-panel-cancelled"
            onClick={() => setActiveTicketSubTab('cancelled')}
            className={`flex-shrink-0 px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
              activeTicketSubTab === 'cancelled'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Cancelled & Refunded ({cancelledBookings.length})
          </button>
        </div>
      );
    };

    if (bookings.length === 0) {
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
    }

    if (subTabBookings.length === 0) {
      return (
        <div className="space-y-6">
          {renderSubTabs()}
          <div className="glass rounded-3xl border border-border-subtle p-12 text-center space-y-4">
            <div className="text-4xl">🎟️</div>
            <h4 className="text-white font-bold text-base capitalize">No {activeTicketSubTab} bookings</h4>
            <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
              {emptyMessage}
            </p>
            {activeTicketSubTab === 'upcoming' && (
              <div className="pt-2">
                <Link
                  href="/events"
                  className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
                >
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderSubTabs()}
        <div className="space-y-4">
          {subTabBookings.map((b) => (
            <BookingCard
              key={b._id}
              booking={b}
              tickets={tickets.filter(
                (t) => t.bookingId === b._id || t.bookingId?.toString() === b._id?.toString()
              )}
              ticketsReady={ticketsReadyMap[b._id?.toString() ?? ''] ?? false}
              isPast={activeTicketSubTab === 'past'}
              collapsible={true}
              isExpanded={expandedBookingId === b.bookingId}
              onToggleExpand={() => setExpandedBookingId(expandedBookingId === b.bookingId ? null : b.bookingId)}
              downloading={downloadingId === b.bookingId}
              resending={resendingId === b.bookingId}
              resendCooldown={resendCooldowns[b.bookingId] || 0}
              onDownload={() => handleDownloadPDF(b.bookingId)}
              onResend={() => handleResendTickets(b.bookingId)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderAccountTab = () => {
    return (
      <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-[100px] pointer-events-none" />
        <ProfileEditor />
      </div>
    );
  };

  const renderSupportTab = () => {
    return (
      <div className="space-y-6">
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

  if (isAuthenticated && onboardingRequired) {
    return (
      <div className="pt-20 sm:pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container-mad max-w-md relative z-10 w-full px-4 mt-8 sm:mt-12">
          <div className="glass-strong rounded-3xl border border-border-subtle p-5 sm:p-8 shadow-2xl transition-all duration-500 hover:border-white/10">
            <ProfileCompletionForm
              initialFirstName={user?.firstName || ''}
              initialLastName={user?.lastName || ''}
              initialMobileNumber={user?.mobileNumber || ''}
              isCheckout={false}
              onCancel={() => logout()}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className={`container-mad max-w-3xl relative z-10 px-4 space-y-8${stickyBarVisible ? ' pb-28 sm:pb-0' : ''}`}>
        <div className="space-y-2">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-text-secondary text-sm">
            Access your secure entry tickets, manage your details, and get support.
          </p>
          {!isBookingsLoading && upcomingCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-purple/15 border border-accent-purple/25 text-accent-purple-light text-xs font-semibold">
              <span>🎟️</span>
              {upcomingCount} Upcoming Event{upcomingCount !== 1 ? 's' : ''}
            </div>
          )}
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
            {/* Tab Bar */}
            <div
              role="tablist"
              aria-label="Dashboard navigation"
              className="glass p-1.5 rounded-2xl border border-white/5 flex gap-1 w-full sm:w-max overflow-x-auto"
            >
              <button
                type="button"
                role="tab"
                id="subtab-tickets"
                aria-controls="subtab-panel-tickets"
                aria-selected={activeTab === 'tickets'}
                onClick={() => handleTabChange('tickets')}
                className={`flex-shrink-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'tickets'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                🎟️ My Tickets
              </button>
              <button
                type="button"
                role="tab"
                id="subtab-account"
                aria-controls="subtab-panel-account"
                aria-selected={activeTab === 'account'}
                onClick={() => handleTabChange('account')}
                className={`flex-shrink-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'account'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                👤 Account Details
              </button>
              <button
                type="button"
                role="tab"
                id="subtab-support"
                aria-controls="subtab-panel-support"
                aria-selected={activeTab === 'support'}
                onClick={() => handleTabChange('support')}
                className={`flex-shrink-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'support'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                ❓ Help &amp; Support
              </button>
            </div>

            {/* Active Tab View */}
            <div className="space-y-6">
              {activeTab === 'tickets' && (
                <div role="tabpanel" id="subtab-panel-tickets" aria-labelledby="subtab-tickets">
                  {renderTicketsTab()}
                </div>
              )}
              {activeTab === 'account' && (
                <div role="tabpanel" id="subtab-panel-account" aria-labelledby="subtab-account">
                  {renderAccountTab()}
                </div>
              )}
              {activeTab === 'support' && (
                <div role="tabpanel" id="subtab-panel-support" aria-labelledby="subtab-support">
                  {renderSupportTab()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {stickyBarVisible && expandedBooking && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          role="toolbar"
          aria-label="Ticket quick actions"
        >
          <div className="mx-4 mb-2 glass border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl px-4 pt-4 pb-3 flex items-center gap-2">
            <button
              type="button"
              aria-label="Download PDF"
              disabled={downloadingId === expandedBooking.bookingId}
              onClick={() => handleDownloadPDF(expandedBooking.bookingId)}
              className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold transition-all disabled:opacity-50"
            >
              {downloadingId === expandedBooking.bookingId ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {downloadingId === expandedBooking.bookingId ? 'Saving...' : 'Download'}
            </button>

            <button
              type="button"
              aria-label="Resend ticket email"
              disabled={
                resendingId === expandedBooking.bookingId ||
                (resendCooldowns[expandedBooking.bookingId] || 0) > 0
              }
              onClick={() => handleResendTickets(expandedBooking.bookingId)}
              className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold transition-all disabled:opacity-50"
            >
              {resendingId === expandedBooking.bookingId ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {(() => {
                if ((resendCooldowns[expandedBooking.bookingId] || 0) > 0)
                  return `${resendCooldowns[expandedBooking.bookingId]}s`;
                if (resendingId === expandedBooking.bookingId) return 'Sending...';
                return 'Email';
              })()}
            </button>

            <button
              type="button"
              aria-label="Share ticket"
              onClick={() => handleShare(expandedBooking.bookingId)}
              className="min-h-[44px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl btn-gradient text-white text-[11px] font-semibold shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={
      <div className="pt-20 sm:pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-purple-300 animate-pulse text-sm">Loading Account...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

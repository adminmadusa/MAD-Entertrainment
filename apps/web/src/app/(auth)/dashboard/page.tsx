'use client';

import { BookingStatus } from '@mad/shared';
import type { Event } from '@mad/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';

import { useBookings } from '@/hooks/use-bookings.hook';
import { useAuth } from '@/providers/AuthProvider';
import { ProfileCompletionForm } from '@/components/auth/ProfileCompletionForm';
import dynamic from 'next/dynamic';
import { DashboardTicketsTab, BookingCardSkeleton, DashboardAccountTab, DashboardSupportTab } from './_components';

type TabType = 'tickets' | 'account' | 'support';

function DashboardContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, onboardingRequired, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab and Expand states
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

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
                  <DashboardTicketsTab
                    bookings={bookings}
                    tickets={tickets}
                    ticketsReadyMap={ticketsReadyMap}
                    isBookingsLoading={isBookingsLoading}
                    bookingsError={bookingsError}
                    expandedBookingId={expandedBookingId}
                    onToggleExpand={(id) => setExpandedBookingId(expandedBookingId === id ? null : id)}
                    downloadingId={downloadingId}
                    resendingId={resendingId}
                    resendCooldowns={resendCooldowns}
                    refetch={refetch}
                    onDownload={handleDownloadPDF}
                    onResend={handleResendTickets}
                    upcomingBookings={upcomingBookings}
                    pastBookings={pastBookings}
                    cancelledBookings={cancelledBookings}
                  />
                </div>
              )}
              {activeTab === 'account' && (
                <div role="tabpanel" id="subtab-panel-account" aria-labelledby="subtab-account">
                  <DashboardAccountTab />
                </div>
              )}
              {activeTab === 'support' && (
                <div role="tabpanel" id="subtab-panel-support" aria-labelledby="subtab-support">
                  <DashboardSupportTab />
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

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';

import { ProfileCompletionForm } from '@/components/auth/ProfileCompletionForm';
import { useBookings } from '@/hooks/use-bookings.hook';
import { useAuth } from '@/providers/AuthProvider';
import { BookingStatus } from '@mad/shared';

import {
  DashboardTicketsTab,
  BookingCardSkeleton,
  DashboardAccountTab,
  DashboardHeader,
  DashboardNavTabs,
  DashboardStickyToolbar,
} from './_components';

type TabType = 'tickets' | 'account';

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
    liveBookings,
    pastBookings,
    cancelledBookings,
    refundedBookings,
  } = useBookings();

  // Auth Redirect check — send unauthenticated users to home, not legacy /login
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Sync tab & reference from query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    const refParam = searchParams.get('ref');

    if (tabParam && ['tickets', 'account'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (refParam) {
      setActiveTab('tickets');
    }

    if (refParam) {
      setExpandedBookingId(refParam);
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
    if (tab !== 'tickets') {
      setExpandedBookingId(null);
    }
    router.push(`/dashboard?tab=${tab}`);
  };

  // Share handler: navigator.share primary, clipboard fallback, AbortError silenced
  const handleShare = async (bookingId: string) => {
    const shareUrl = `${window.location.origin}/dashboard?ref=${bookingId}`;
    try {
      setErrorMsg('');
      setInfoMsg('');
      setExpandedBookingId(bookingId);
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
      <div className="pt-28 sm:pt-32 pb-16 min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container-mad max-w-md relative z-10 w-full px-4 mt-6 sm:mt-8">
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
    <div className="pt-28 sm:pt-32 pb-16 min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className={`container-mad max-w-5xl relative z-10 px-4 space-y-8${stickyBarVisible ? ' pb-28 sm:pb-0' : ''}`}>
        <DashboardHeader
          userName={userName}
          bookings={bookings}
          upcomingBookings={upcomingBookings}
        />

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
          <div className="space-y-6">
            <div className="w-full h-12 bg-white/10 rounded-2xl animate-pulse" />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : (
          <div className="space-y-6">
            <DashboardNavTabs
              activeTab={activeTab}
              bookingsCount={bookings.length}
              onTabChange={handleTabChange}
            />

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
                    liveBookings={liveBookings}
                    pastBookings={pastBookings}
                    cancelledBookings={cancelledBookings}
                    refundedBookings={refundedBookings}
                  />
                </div>
              )}
              {activeTab === 'account' && (
                <div role="tabpanel" id="subtab-panel-account" aria-labelledby="subtab-account">
                  <DashboardAccountTab />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {stickyBarVisible && expandedBooking && (
        <DashboardStickyToolbar
          expandedBooking={expandedBooking}
          downloadingId={downloadingId}
          resendingId={resendingId}
          resendCooldowns={resendCooldowns}
          onDownload={handleDownloadPDF}
          onResend={handleResendTickets}
          onShare={handleShare}
        />
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

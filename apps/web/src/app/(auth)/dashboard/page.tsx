'use client';

import { BookingStatus, QUERY_KEYS } from '@mad/shared';
import type { Booking, Event } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense, useMemo } from 'react';

import { EntryPassGrid } from '@/components/booking/shared/EntryPassGrid';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { apiClient, extractApiError } from '@/lib/api/client';
import {
  publicGetMyBookings,
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

const getEventCategoryStyles = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('music') || cat.includes('concert') || cat.includes('club')) {
    return {
      emoji: '🎵',
      gradient: 'from-purple-900 to-indigo-950 border-purple-500/20'
    };
  }
  if (cat.includes('sport') || cat.includes('game') || cat.includes('match')) {
    return {
      emoji: '⚽',
      gradient: 'from-emerald-900 to-teal-950 border-emerald-500/20'
    };
  }
  if (cat.includes('theater') || cat.includes('comedy') || cat.includes('show') || cat.includes('play')) {
    return {
      emoji: '🎭',
      gradient: 'from-rose-900 to-red-950 border-rose-500/20'
    };
  }
  return {
    emoji: '🎟️',
    gradient: 'from-slate-800 to-slate-950 border-slate-700/20'
  };
};

type TabType = 'tickets' | 'account' | 'support';

function DashboardContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab and Expand states
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [activeTicketSubTab, setActiveTicketSubTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  // Action states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [refetchIntervalTime, setRefetchIntervalTime] = useState<number | false>(false);

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
    refetchInterval: refetchIntervalTime,
  });

  const bookings = useMemo(
    () => bookingsData?.bookings || [],
    [bookingsData?.bookings]
  );
  const tickets = bookingsData?.tickets || [];

  useEffect(() => {
    const ticketsReadyMap = bookingsData?.ticketsReadyMap || {};
    const hasPending = bookings.some(
      (b) => b.status === BookingStatus.CONFIRMED && !ticketsReadyMap[b._id?.toString() ?? '']
    );
    setRefetchIntervalTime(hasPending ? 3000 : false);
  }, [bookings, bookingsData?.ticketsReadyMap]);

  const handleDownloadPDF = async (bookingId: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setDownloadingId(bookingId);

      const { data } = await apiClient.post<{ data: { downloadToken: string } }>(
        `/bookings/${bookingId}/download-token`
      );
      const token = data?.data?.downloadToken;
      if (!token) {
        throw new Error('Failed to generate download token');
      }

      const downloadUrl = `${apiClient.defaults.baseURL || ''}/bookings/${bookingId}/download?token=${token}`;
      window.open(downloadUrl, '_blank');
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

    const filteredBookings = bookings.filter((b) => {
      return b.status !== BookingStatus.FAILED && b.status !== BookingStatus.EXPIRED;
    });

    if (filteredBookings.length > 0) {
      const now = new Date();
      const upcomingBookings = filteredBookings.filter((b) => {
        const eventInfo = b.eventId as unknown as Partial<Event>;
        const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
        const isUpcomingStatus = [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT].includes(b.status as BookingStatus);
        if (!isUpcomingStatus) return false;
        if (!startDate) return true;
        return startDate >= now;
      });

      const pastBookings = filteredBookings.filter((b) => {
        const eventInfo = b.eventId as unknown as Partial<Event>;
        const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
        const isPastStatus = b.status === BookingStatus.CONFIRMED;
        if (!isPastStatus) return false;
        if (!startDate) return false;
        return startDate < now;
      });

      const cancelledBookings = filteredBookings.filter((b) => {
        return [BookingStatus.CANCELLED, BookingStatus.REFUNDED].includes(b.status as BookingStatus);
      });

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

      const renderBookingAccordion = (booking: Booking, isPast = false) => {
        const isExpanded = expandedBookingId === booking.bookingId;
        const bookingTickets = tickets.filter(
          (t) => t.bookingId === booking._id || t.bookingId?.toString() === booking._id?.toString()
        );
        const bookingTicketsReady =
          bookingsData?.ticketsReadyMap?.[booking._id?.toString() ?? ''] ?? false;

        const eventInfo = booking.eventId as unknown as Partial<Event>;
        const imageUrl = eventInfo?.bannerImage?.url || eventInfo?.coverImage?.url;
        const catStyles = getEventCategoryStyles(eventInfo?.category);

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
              id={`booking-header-${booking.bookingId}`}
              onClick={() => setExpandedBookingId(isExpanded ? null : booking.bookingId)}
              aria-expanded={isExpanded}
              aria-controls={`booking-content-${booking.bookingId}`}
              className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 focus:outline-none min-h-[44px]"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-grow min-w-0">
                {/* Event Thumbnail */}
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${catStyles.gradient} border flex items-center justify-center text-lg sm:text-xl flex-shrink-0 select-none`}>
                    {catStyles.emoji}
                  </div>
                )}

                {/* Left/Center Text */}
                <div className="space-y-1 min-w-0 flex-grow">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-bold text-sm sm:text-base leading-snug truncate">
                      {eventInfo?.title || 'Booking Details'}
                    </h3>
                    {/* Status Badge */}
                    {booking.status !== BookingStatus.CONFIRMED && (
                      <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                        [BookingStatus.CANCELLED, BookingStatus.REFUNDED].includes(booking.status as BookingStatus)
                          ? 'border-red-500/30 text-red-400 bg-red-500/10'
                          : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-[11px] sm:text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {eventInfo?.startDate && (
                      <span>Event Date: {new Date(eventInfo.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    )}
                    {eventInfo?.venue && (
                      <span className="truncate max-w-[150px] sm:max-w-none">| {eventInfo.venue}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Side: Ticket Count & Chevron */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                <span className="text-text-secondary text-xs font-semibold whitespace-nowrap bg-white/5 px-2.5 py-1 rounded-lg">
                  {booking.totalTickets} {booking.totalTickets === 1 ? 'Pass' : 'Passes'}
                </span>
                <span
                  className="text-text-secondary text-xs transition-transform duration-300 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Accordion Content */}
            {isExpanded && (
              <div
                id={`booking-content-${booking.bookingId}`}
                role="region"
                aria-labelledby={`booking-header-${booking.bookingId}`}
                className="px-4 pb-6 pt-2 sm:px-5 border-t border-white/5 space-y-5 animate-in fade-in duration-200"
              >
                {/* 1. Entry Passes — First visible element after expand */}
                {booking.status === BookingStatus.CONFIRMED ? (
                  <div className="space-y-4 pt-2">
                    <div aria-live="polite">
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
                  </div>
                ) : (
                  <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-muted text-xs">
                    Tickets are unavailable for this booking.
                  </div>
                )}

                {/* 2. Action Buttons — Second, immediately after QR */}
                {booking.status === BookingStatus.CONFIRMED && bookingTicketsReady && (
                  <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/5">
                    <TicketActions
                      downloading={downloadingId === booking.bookingId}
                      resending={resendingId === booking.bookingId}
                      cooldown={resendCooldowns[booking.bookingId] || 0}
                      onDownload={() => handleDownloadPDF(booking.bookingId)}
                      onResend={() => handleResendTickets(booking.bookingId)}
                    />
                  </div>
                )}

                {/* 3. Metadata Grid — Last, supporting context only */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5 text-xs text-text-secondary">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Guest Name</span>
                    <span className="text-white font-semibold">{booking.guestName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Venue</span>
                    <span className="text-white font-semibold">{eventInfo?.venue || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Show Time</span>
                    <span className="text-white font-semibold">{eventInfo?.showTime || 'N/A'}</span>
                  </div>
                  {booking.createdAt && (
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider block">Purchased On</span>
                      <span className="text-white font-semibold font-sans">
                        {new Date(booking.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} {new Date(booking.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Reference ID</span>
                    <span className="text-white font-semibold font-mono">{booking.bookingId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Total Tickets</span>
                    <span className="text-white font-semibold">{booking.totalTickets} Passes</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

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
            {subTabBookings.map((b) => renderBookingAccordion(b, activeTicketSubTab === 'past'))}
          </div>
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
            <p className="text-text-secondary text-xs mt-1">Manage your account details and linked contact information</p>
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
            {/* Stateful Glassmorphic Segmented Control Tab Bar — WCAG role="tablist" */}
            <div
              className="glass p-1.5 rounded-2xl border border-white/5 flex flex-row gap-1 overflow-x-auto scrollbar-none w-full"
              role="tablist"
              aria-label="Dashboard sections"
            >
              <button
                type="button"
                role="tab"
                id="tab-tickets"
                aria-selected={activeTab === 'tickets'}
                aria-controls="tabpanel-tickets"
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
                id="tab-account"
                aria-selected={activeTab === 'account'}
                aria-controls="tabpanel-account"
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
                id="tab-support"
                aria-selected={activeTab === 'support'}
                aria-controls="tabpanel-support"
                onClick={() => handleTabChange('support')}
                className={`flex-shrink-0 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'support'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                ❓ Help & Support
              </button>
            </div>

            {/* Active Tab View */}
            <div
              id="tabpanel-tickets"
              role="tabpanel"
              aria-labelledby="tab-tickets"
              hidden={activeTab !== 'tickets'}
              className="space-y-6"
            >
              {renderTicketsTab()}
            </div>
            <div
              id="tabpanel-account"
              role="tabpanel"
              aria-labelledby="tab-account"
              hidden={activeTab !== 'account'}
              className="space-y-6"
            >
              {renderAccountTab()}
            </div>
            <div
              id="tabpanel-support"
              role="tabpanel"
              aria-labelledby="tab-support"
              hidden={activeTab !== 'support'}
              className="space-y-6"
            >
              {renderSupportTab()}
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
        <div className="text-purple-300 animate-pulse text-sm">Loading Account...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

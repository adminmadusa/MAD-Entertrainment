'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BookingCard } from '@/components/booking/shared/BookingCard';
import type { Booking, Ticket } from '@mad/types';
import { Button } from '@mad/ui';

export function BookingCardSkeleton() {
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

interface DashboardTicketsTabProps {
  bookings: Booking[];
  tickets: Ticket[];
  ticketsReadyMap: Record<string, boolean>;
  isBookingsLoading: boolean;
  bookingsError: boolean;
  expandedBookingId: string | null;
  onToggleExpand: (bookingId: string) => void;
  downloadingId: string | null;
  resendingId: string | null;
  resendCooldowns: Record<string, number>;
  refetch: () => void;
  onDownload: (bookingId: string) => void;
  onResend: (bookingId: string) => void;
  upcomingBookings: Booking[];
  liveBookings: Booking[];
  pastBookings: Booking[];
  cancelledBookings: Booking[];
  refundedBookings: Booking[];
}

export function DashboardTicketsTab({
  bookings,
  tickets,
  ticketsReadyMap,
  isBookingsLoading,
  bookingsError,
  expandedBookingId,
  onToggleExpand,
  downloadingId,
  resendingId,
  resendCooldowns,
  refetch,
  onDownload,
  onResend,
  upcomingBookings,
  liveBookings,
  pastBookings,
  cancelledBookings,
  refundedBookings,
}: DashboardTicketsTabProps) {
  const [activeTicketSubTab, setActiveTicketSubTab] = useState<'upcoming' | 'live' | 'past' | 'cancelled' | 'refunded'>('upcoming');

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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all"
        >
          Retry
        </Button>
      </div>
    );
  }

  let currentTabBookings = upcomingBookings;
  if (activeTicketSubTab === 'live') {
    currentTabBookings = liveBookings;
  } else if (activeTicketSubTab === 'past') {
    currentTabBookings = pastBookings;
  } else if (activeTicketSubTab === 'cancelled') {
    currentTabBookings = cancelledBookings;
  } else if (activeTicketSubTab === 'refunded') {
    currentTabBookings = refundedBookings;
  }

  const getEmptyMessage = () => {
    switch (activeTicketSubTab) {
      case 'live':
        return 'No live events right now.';
      case 'upcoming':
        return "You don't have any upcoming event bookings.";
      case 'past':
        return 'Your attended events will appear here.';
      case 'cancelled':
        return 'No cancelled bookings.';
      case 'refunded':
        return 'No refunded bookings.';
      default:
        return 'No bookings found.';
    }
  };

  const renderSubTabs = () => {
    const tabs: { key: typeof activeTicketSubTab; label: string; count: number }[] = [
      { key: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
      { key: 'live', label: 'Live', count: liveBookings.length },
      { key: 'past', label: 'Past Events', count: pastBookings.length },
      { key: 'cancelled', label: 'Cancelled', count: cancelledBookings.length },
      { key: 'refunded', label: 'Refunded', count: refundedBookings.length },
    ];

    return (
      <div
        className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1 w-full"
        role="tablist"
        aria-label="Ticket categories"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`subtab-${tab.key}`}
            aria-selected={activeTicketSubTab === tab.key}
            aria-controls={`subtab-panel-${tab.key}`}
            onClick={() => setActiveTicketSubTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 min-h-[38px] flex items-center gap-1.5 focus-ring ${
              activeTicketSubTab === tab.key
                ? 'bg-white text-black font-extrabold shadow-md'
                : 'text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              activeTicketSubTab === tab.key ? 'bg-black/10 text-black font-black' : 'bg-white/10 text-text-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
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

  return (
    <div className="space-y-5">
      {/* Sticky Category filter headers (Search removed) */}
      <div className="sticky top-[80px] z-20 bg-background/95 backdrop-blur-md pb-4 pt-1 border-b border-white/5">
        {renderSubTabs()}
      </div>

      <div
        role="tabpanel"
        id={`subtab-panel-${activeTicketSubTab}`}
        aria-labelledby={`subtab-${activeTicketSubTab}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {currentTabBookings.length === 0 ? (
          <div className="col-span-full glass rounded-3xl border border-border-subtle p-10 text-center space-y-4">
            <div className="text-3xl">🎟️</div>
            <h4 className="text-white font-bold text-sm">No results</h4>
            <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
              {getEmptyMessage()}
            </p>
          </div>
        ) : (
          currentTabBookings.map((b) => (
            <div
              key={b._id}
              className={expandedBookingId === b.bookingId ? 'col-span-full' : ''}
            >
              <BookingCard
                booking={b}
                tickets={tickets.filter(
                  (t) => t.bookingId === b._id || t.bookingId?.toString() === b._id?.toString()
                )}
                ticketsReady={ticketsReadyMap[b._id?.toString() ?? ''] ?? false}
                isPast={activeTicketSubTab === 'past'}
                collapsible={true}
                isExpanded={expandedBookingId === b.bookingId}
                onToggleExpand={() => onToggleExpand(b.bookingId)}
                downloading={downloadingId === b.bookingId}
                resending={resendingId === b.bookingId}
                resendCooldown={resendCooldowns[b.bookingId] || 0}
                onDownload={() => onDownload(b.bookingId)}
                onResend={() => onResend(b.bookingId)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

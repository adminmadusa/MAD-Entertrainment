'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BookingCard } from '@/components/booking/shared/BookingCard';
import type { Booking, Ticket, Event } from '@mad/types';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter current tab bookings by search query
  const filteredTabBookings = currentTabBookings.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const eventInfo = b.eventId as unknown as Event;
    const titleMatch = eventInfo?.title?.toLowerCase().includes(q) || false;
    const venueMatch = eventInfo?.venue?.toLowerCase().includes(q) || false;
    const refMatch = b.bookingId?.toLowerCase().includes(q) || false;

    return titleMatch || venueMatch || refMatch;
  });

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
        className="glass p-1.5 rounded-2xl border border-white/5 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none w-full"
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
            onClick={() => {
              setActiveTicketSubTab(tab.key);
              setSearchQuery(''); // Clear search on tab switch
            }}
            className={`flex-shrink-0 px-4 py-2 text-xs font-extrabold rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap focus-ring ${
              activeTicketSubTab === tab.key
                ? 'bg-accent-purple text-white shadow-md font-black'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label} ({tab.count})
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
      {/* Sticky Search and Category filter headers */}
      <div className="sticky top-[80px] z-20 space-y-4 bg-background/95 backdrop-blur-md pb-4 pt-1 border-b border-white/5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by event, venue, or reference ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-accent-purple/50 focus:bg-white/[0.07] px-4 py-2.5 pl-10 rounded-xl text-xs text-white placeholder-text-muted focus:outline-none transition-all duration-300"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs select-none">🔍</span>
        </div>
        {renderSubTabs()}
      </div>

      <div
        role="tabpanel"
        id={`subtab-panel-${activeTicketSubTab}`}
        aria-labelledby={`subtab-${activeTicketSubTab}`}
        className="space-y-4"
      >
        {filteredTabBookings.length === 0 ? (
          <div className="glass rounded-3xl border border-border-subtle p-10 text-center space-y-4">
            <div className="text-3xl">🎟️</div>
            <h4 className="text-white font-bold text-sm">No results</h4>
            <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
              {searchQuery ? `No matches found for "${searchQuery}" in this category.` : getEmptyMessage()}
            </p>
          </div>
        ) : (
          filteredTabBookings.map((b) => (
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
              onToggleExpand={() => onToggleExpand(b.bookingId)}
              downloading={downloadingId === b.bookingId}
              resending={resendingId === b.bookingId}
              resendCooldown={resendCooldowns[b.bookingId] || 0}
              onDownload={() => onDownload(b.bookingId)}
              onResend={() => onResend(b.bookingId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

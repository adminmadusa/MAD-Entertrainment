'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BookingCard } from '@/components/booking/shared/BookingCard';
import { BookingStatus } from '@mad/shared';
import type { Booking, Ticket } from '@mad/types';

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
  pastBookings: Booking[];
  cancelledBookings: Booking[];
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
  pastBookings,
  cancelledBookings,
}: DashboardTicketsTabProps) {
  const [activeTicketSubTab, setActiveTicketSubTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

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
            onToggleExpand={() => onToggleExpand(b.bookingId)}
            downloading={downloadingId === b.bookingId}
            resending={resendingId === b.bookingId}
            resendCooldown={resendCooldowns[b.bookingId] || 0}
            onDownload={() => onDownload(b.bookingId)}
            onResend={() => onResend(b.bookingId)}
          />
        ))}
      </div>
    </div>
  );
}

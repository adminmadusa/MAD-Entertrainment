'use client';

import { AdminBooking } from '@/lib/api/admin/booking.service';
import { BookingStatus, getBookingStatusLabel } from '@mad/shared';
import { Input, Button } from '@mad/ui';

export interface BookingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  eventFilter: string;
  onEventFilterChange: (value: string) => void;
  events: Array<{ _id: string; title: string }>;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  bookingStatusFilters: BookingStatus[];
  bookings: AdminBooking[];
}

export default function BookingFilters({
  search,
  onSearchChange,
  eventFilter,
  onEventFilterChange,
  events,
  statusFilter,
  onStatusFilterChange,
  bookingStatusFilters,
  bookings,
}: BookingFiltersProps) {
  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) return;

    const headers = [
      'Reference',
      'First Name',
      'Last Name',
      'Customer Email',
      'Customer Phone',
      'Marketing: Keep Updated',
      'Marketing: Best Events',
      'Event',
      'Amount',
      'Status',
      'Date',
    ];
    const csvContent = [
      headers.join(','),
      ...bookings.map((b) => {
        const customer = b.userId ?? b.guestInfo;
        const firstName = customer?.firstName?.replace(/,/g, '') ?? '—';
        const lastName = customer?.lastName?.replace(/,/g, '') ?? '—';
        const email = customer?.email?.replace(/,/g, '') ?? '—';
        const phone = customer?.phone || '—';
        const keepUpdated = customer?.keepUpdated ? 'Yes' : 'No';
        const sendBestEvents = customer?.sendBestEvents ? 'Yes' : 'No';
        const eventTitle = (b.eventId as { title?: string })?.title?.replace(/,/g, '') ?? '—';
        return `${b.bookingId},${firstName},${lastName},${email},${phone},${keepUpdated},${sendBestEvents},${eventTitle},${b.totalAmount},${getBookingStatusLabel(b.status)},${new Date(b.createdAt).toLocaleDateString('en-IN')}`;
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="w-full md:w-auto min-w-[20rem]">
        <Input
          type="search"
          placeholder="Search by reference or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        value={eventFilter}
        aria-label="Filter by Event"
        onChange={(e) => onEventFilterChange(e.target.value)}
        className="flex-1 min-w-[12rem] px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
      >
        <option value="">All Events</option>
        {events.map((ev) => (
          <option key={ev._id} value={ev._id}>
            {ev.title}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        aria-label="Filter by Status"
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
      >
        <option value="">All Statuses</option>
        {bookingStatusFilters.map((status) => (
          <option key={status} value={status}>
            {getBookingStatusLabel(status)}
          </option>
        ))}
      </select>

      <Button
        onClick={handleExportCSV}
        disabled={bookings.length === 0}
        variant="secondary"
      >
        Export CSV
      </Button>
    </div>
  );
}

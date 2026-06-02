import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { PublicBookingService } from './booking.service';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const bookingId = new Types.ObjectId();

function makeBooking(totalTickets: number, status = 'confirmed') {
  return {
    _id: bookingId,
    bookingId: 'MAD-2026-ABCDE',
    status,
    totalTickets,
  };
}

function makeTicket(n: number) {
  return { _id: new Types.ObjectId(), bookingId, ticketId: `TKT-MAD-2026-ABCDE-${String(n).padStart(3, '0')}` };
}

function mockFindOne(booking: any) {
  vi.mocked(Booking.findOne).mockReturnValue({
    populate: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(booking),
    }),
  } as any);
}

// ─────────────────────────────────────────────────────────────
// getBookingByReference — ticketsReady
// ─────────────────────────────────────────────────────────────

describe('PublicBookingService.getBookingByReference — ticketsReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ticketsReady: true when tickets.length === booking.totalTickets', async () => {
    const booking = makeBooking(3);
    const tickets = [makeTicket(1), makeTicket(2), makeTicket(3)];

    mockFindOne(booking);
    vi.mocked(Ticket.find).mockResolvedValue(tickets as any);

    const result = await PublicBookingService.getBookingByReference('MAD-2026-ABCDE');

    expect(result.ticketsReady).toBe(true);
    expect(result.tickets).toHaveLength(3);
  });

  it('returns ticketsReady: false when tickets.length === 0 (generation not started)', async () => {
    const booking = makeBooking(3);

    mockFindOne(booking);
    vi.mocked(Ticket.find).mockResolvedValue([] as any);

    const result = await PublicBookingService.getBookingByReference('MAD-2026-ABCDE');

    expect(result.ticketsReady).toBe(false);
    expect(result.tickets).toHaveLength(0);
  });

  it('returns ticketsReady: false when tickets.length < booking.totalTickets (partial generation — totalTickets=4, tickets.length=2)', async () => {
    const booking = makeBooking(4);
    const tickets = [makeTicket(1), makeTicket(2)];

    mockFindOne(booking);
    vi.mocked(Ticket.find).mockResolvedValue(tickets as any);

    const result = await PublicBookingService.getBookingByReference('MAD-2026-ABCDE');

    expect(result.ticketsReady).toBe(false);
    expect(result.tickets).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// getMyBookings — ticketsReadyMap
// ─────────────────────────────────────────────────────────────

describe('PublicBookingService.getMyBookings — ticketsReadyMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = new Types.ObjectId().toString();

  function mockFind(bookings: any[]) {
    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue(bookings),
      }),
    } as any);
  }

  it('maps ticketsReady: true for a booking with all tickets present', async () => {
    const booking = makeBooking(2);
    const tickets = [makeTicket(1), makeTicket(2)];

    mockFind([booking]);
    vi.mocked(Ticket.find).mockResolvedValue(tickets as any);

    const result = await PublicBookingService.getMyBookings(userId);

    expect(result.ticketsReadyMap.get(bookingId.toString())).toBe(true);
  });

  it('maps ticketsReady: false for a booking with zero tickets', async () => {
    const booking = makeBooking(2);

    mockFind([booking]);
    vi.mocked(Ticket.find).mockResolvedValue([] as any);

    const result = await PublicBookingService.getMyBookings(userId);

    expect(result.ticketsReadyMap.get(bookingId.toString())).toBe(false);
  });

  it('maps ticketsReady: false for a booking with partial tickets (totalTickets=4, tickets.length=2)', async () => {
    const booking = makeBooking(4);
    const tickets = [makeTicket(1), makeTicket(2)];

    mockFind([booking]);
    vi.mocked(Ticket.find).mockResolvedValue(tickets as any);

    const result = await PublicBookingService.getMyBookings(userId);

    expect(result.ticketsReadyMap.get(bookingId.toString())).toBe(false);
  });
});

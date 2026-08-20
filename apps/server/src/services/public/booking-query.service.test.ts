import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_jwt_admin_secret_with_32_characters_long_minimum',
    JWT_SESSION_SECRET: 'test_jwt_session_secret_with_32_characters_long_minimum',
    ALLOWED_ORIGINS: 'http://localhost:3000',
  })),
}));

vi.mock('../../models/booking.schema', () => {
  const { Types } = require('mongoose');
  const mockBooking = vi.fn().mockImplementation(function (data) {
    this._id = new Types.ObjectId('60c72b2f9b1d8e25b8d29b01');
    this.bookingId = 'MAD-2026-ABCDE';
    this.status = data?.status || 'awaiting_payment';
    this.tickets = data?.tickets || [];
    this.totalTickets = data?.totalTickets || 0;
    Object.assign(this, data);
    return this;
  });
  (mockBooking as any).findOne = vi.fn();
  (mockBooking as any).find = vi.fn();
  return {
    Booking: mockBooking,
  };
});

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { PublicBookingService } from './booking.service';

const bookingId = new Types.ObjectId('60c72b2f9b1d8e25b8d29b01');

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

describe('PublicBookingService.getMyBookings — ticketsReadyMap', () => {
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserModel.findById).mockResolvedValue({
      _id: new Types.ObjectId(userId),
      email: 'user@example.com',
    } as any);
  });

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

describe('PublicBookingService.getMyBookings — ownership and reconciliation matching', () => {
  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'testuser@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);
    vi.mocked(Ticket.find).mockResolvedValue([]);
  });

  it('returns confirmed guest bookings matching user email', async () => {
    const booking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-GUEST1',
      guestEmail: 'testuser@example.com',
      status: 'confirmed',
    };

    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([booking]),
      }),
    } as any);

    const result = await PublicBookingService.getMyBookings(mockUser._id.toString());
    expect(result.bookings).toContainEqual(booking);
  });

  it('does not return guest bookings matching an unrelated email', async () => {
    const booking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-GUEST2',
      guestEmail: 'unrelated@example.com',
      status: 'confirmed',
    };

    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await PublicBookingService.getMyBookings(mockUser._id.toString());
    expect(result.bookings).not.toContainEqual(booking);
  });

  it('does not return guest bookings that are FAILED', async () => {
    const booking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-GUEST3',
      guestEmail: 'testuser@example.com',
      status: 'failed',
    };

    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await PublicBookingService.getMyBookings(mockUser._id.toString());
    expect(result.bookings).not.toContainEqual(booking);
  });

  it('does not return guest bookings that are EXPIRED', async () => {
    const booking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-GUEST4',
      guestEmail: 'testuser@example.com',
      status: 'expired',
    };

    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await PublicBookingService.getMyBookings(mockUser._id.toString());
    expect(result.bookings).not.toContainEqual(booking);
  });

  it('deduplicates when a booking matches both userId and guestEmail', async () => {
    const booking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-MATCHBOTH',
      userId: mockUser._id,
      guestEmail: 'testuser@example.com',
      status: 'confirmed',
    };

    vi.mocked(Booking.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([booking]),
      }),
    } as any);

    const result = await PublicBookingService.getMyBookings(mockUser._id.toString());
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]._id).toEqual(booking._id);
  });
});

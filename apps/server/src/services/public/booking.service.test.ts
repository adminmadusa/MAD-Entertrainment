import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';

// ─────────────────────────────────────────────────────────────
// Hoisted Mock Variables
// ─────────────────────────────────────────────────────────────

const { mockSession, mockBookingSave, mockRedis } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      try {
        await callback();
      } catch (err) {
        throw err;
      }
    }),
    endSession: vi.fn().mockResolvedValue(undefined),
  };

  const saveFn = vi.fn().mockResolvedValue(undefined);

  const redis = {
    get: vi.fn(),
    del: vi.fn(),
  };

  return {
    mockSession: session,
    mockBookingSave: saveFn,
    mockRedis: redis,
  };
});

// ─────────────────────────────────────────────────────────────
// vi.mock declarations
// ─────────────────────────────────────────────────────────────

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockResolvedValue(mockSession),
    },
    startSession: vi.fn().mockResolvedValue(mockSession),
  };
});

vi.mock('../../models/booking.schema', () => {
  const { Types } = require('mongoose');
  const mockBooking = vi.fn().mockImplementation(function (data) {
    this._id = new Types.ObjectId('60c72b2f9b1d8e25b8d29b01');
    this.bookingId = 'MAD-2026-ABCDE';
    this.status = data?.status || 'awaiting_payment';
    this.save = mockBookingSave;
    this.tickets = data?.tickets || [];
    this.totalTickets = data?.totalTickets || 0;
    this.totalAmount = data?.totalAmount || 0;
    this.bookingVersion = 0;
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

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    findOne: vi.fn(),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    reserveForBooking: vi.fn(),
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../config/redis', () => ({
  getRedis: vi.fn().mockReturnValue(mockRedis),
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PublicBookingService } from './booking.service';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { Event } from '../../models/event.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { ReservationService } from '../reservation.service';
import { CacheService } from '../cache.service';
import { emitToEvent, emitToAdmin } from '../../config/socket';
import { auditLog } from '../../utils/audit';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// createBooking — transactions & rollback
// ─────────────────────────────────────────────────────────────

describe('PublicBookingService.createBooking — transactions & rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingSave.mockClear();
    mockRedis.get.mockReset();
    mockRedis.del.mockReset();
  });

  it('successfully creates a GA booking inside a transaction', async () => {
    const mockEvent = {
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
      status: 'published',
      isSoldOut: false,
      bookingMode: 'general_admission',
      title: 'GA Concert',
      category: 'music',
      ticketTiers: [
        {
          tier: 'GA_EARLY',
          name: 'Early GA',
          isActive: true,
          price: 500,
          soldCount: 0,
          totalCapacity: 100,
          taxPercent: 18,
        },
      ],
    };

    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
    const mockPostCommit = vi.fn().mockResolvedValue(undefined);
    const mockReservations = [
      { reservationId: 'RES-001', tier: 'GA_EARLY', quantity: 2, status: 'reserved' },
    ];
    vi.mocked(ReservationService.reserveForBooking).mockResolvedValue({
      reservations: mockReservations,
      postCommit: mockPostCommit,
    } as any);

    const result = await PublicBookingService.createBooking(
      {
        eventId: mockEvent._id.toString(),
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '9876543210',
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
      },
      'session-123'
    );

    // Verify transaction session was started
    expect(mongoose.startSession).toHaveBeenCalled();

    // Verify booking save was called with the session
    expect(mockBookingSave).toHaveBeenCalledWith({ session: mockSession });

    // Verify reservation allocation was called with the session
    expect(ReservationService.reserveForBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: mockEvent._id,
        bookingMode: 'general_admission',
        quantity: 2,
      }),
      mockSession
    );

    // Verify postCommit closure (owned by ReservationService) was invoked post-commit
    expect(mockPostCommit).toHaveBeenCalledTimes(1);
    expect(emitToAdmin).toHaveBeenCalledWith('bookings', 'booking:created', expect.any(Object), expect.any(String));
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BOOKING_CREATED',
        status: 'success',
      })
    );
    expect(result.status).toBe('awaiting_payment');
  });

  it('rolls back booking and reservations if reservation allocation fails', async () => {
    const mockEvent = {
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
      status: 'published',
      isSoldOut: false,
      bookingMode: 'general_admission',
      title: 'GA Concert',
      category: 'music',
      ticketTiers: [
        {
          tier: 'GA_EARLY',
          name: 'Early GA',
          isActive: true,
          price: 500,
          soldCount: 0,
          totalCapacity: 100,
          taxPercent: 18,
        },
      ],
    };

    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(ReservationService.reserveForBooking).mockRejectedValue(new Error('Allocation failed'));

    // The transaction helper should propagate the error so the transaction rolls back
    await expect(
      PublicBookingService.createBooking(
        {
          eventId: mockEvent._id.toString(),
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestPhone: '9876543210',
          tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
        },
        'session-123'
      )
    ).rejects.toThrow('Allocation failed');

    // Booking save was called with the session (but transaction aborted, so it won't persist)
    expect(mockBookingSave).toHaveBeenCalledWith({ session: mockSession });

    // Side effects must NOT be executed because the transaction failed
    expect(CacheService.delPattern).not.toHaveBeenCalled();
  });

  it('rolls back seat layout changes if seat lock conflicts', async () => {
    const mockEvent = {
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b03'),
      status: 'published',
      isSoldOut: false,
      bookingMode: 'seat_based',
      title: 'Seat Concert',
      category: 'music',
      ticketTiers: [
        {
          tier: 'VVIP',
          name: 'VVIP Seats',
          isActive: true,
          price: 1000,
          soldCount: 0,
          totalCapacity: 10,
          taxPercent: 18,
        },
      ],
    };

    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    // Mock SeatLayout finding: A1 exists and is available
    vi.mocked(SeatLayout.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          eventId: mockEvent._id,
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      }),
    } as any);

    // Mock Redis seat lock owned by current session
    mockRedis.get.mockResolvedValue('session-123');

    const mockReservations = [
      { reservationId: 'RES-001', seatId: 'A1', status: 'reserved' },
    ];
    vi.mocked(ReservationService.reserveForBooking).mockResolvedValue({
      reservations: mockReservations,
      postCommit: vi.fn().mockResolvedValue(undefined),
    } as any);

    // Simulate concurrent seat acquisition: SeatLayout.updateOne returns modifiedCount: 0
    vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

    await expect(
      PublicBookingService.createBooking(
        {
          eventId: mockEvent._id.toString(),
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestPhone: '9876543210',
          tickets: [{ tier: 'VVIP', quantity: 1, seats: [{ seatId: 'A1', row: 'A', number: 1, section: 'VVIP' }] }],
        },
        'session-123'
      )
    ).rejects.toThrow('Some of the selected seats were locked by another user');

    // The transaction rolls back, side effects do not execute
    expect(emitToEvent).not.toHaveBeenCalledWith(expect.any(String), 'seat:reserved', expect.any(Object), expect.any(String));
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});

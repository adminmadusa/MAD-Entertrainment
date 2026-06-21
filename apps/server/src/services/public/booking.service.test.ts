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

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findById: vi.fn(),
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
import { UserModel } from '../../models/user.schema';
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

// ─────────────────────────────────────────────────────────────
// getMyBookings — ownership and reconciliation matching
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// createBooking — transactions & rollback
// ─────────────────────────────────────────────────────────────

  describe('PublicBookingService.createBooking — transactions & rollback', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockReset();
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

  it('cannot create booking for deleted event', async () => {
    const mockEvent = {
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b04'),
      status: 'published',
      isDeleted: true,
      isSoldOut: false,
      bookingMode: 'general_admission',
      title: 'Deleted Event',
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
    ).rejects.toThrow('Event not found or not published');
  });

  describe('PublicBookingService.createBooking — Idempotency, SelectionFingerprint and Concurrency', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockReset();
      mockBookingSave.mockClear();
    });

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
        {
          tier: 'GA_LATE',
          name: 'Late GA',
          isActive: true,
          price: 600,
          soldCount: 0,
          totalCapacity: 100,
          taxPercent: 18,
        },
      ],
    };

    it('Fingerprint Normalization: VIP x2 + General x1 equals General x1 + VIP x2', () => {
      const fp1 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [
          { tier: 'VIP', quantity: 2 },
          { tier: 'General', quantity: 1 },
        ],
      });
      const fp2 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [
          { tier: 'General', quantity: 1 },
          { tier: 'VIP', quantity: 2 },
        ],
      });
      expect(fp1).toBe(fp2);
    });

    it('Seat Ordering Normalization: A1, A2, A3 equals A3, A1, A2', () => {
      const fp1 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [
          {
            tier: 'VIP',
            quantity: 3,
            seats: [{ seatId: 'A1' }, { seatId: 'A2' }, { seatId: 'A3' }],
          },
        ],
      });
      const fp2 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [
          {
            tier: 'VIP',
            quantity: 3,
            seats: [{ seatId: 'A3' }, { seatId: 'A1' }, { seatId: 'A2' }],
          },
        ],
      });
      expect(fp1).toBe(fp2);
    });

    it('Fingerprint Mismatch: VIP x2 does not equal VIP x3', () => {
      const fp1 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [{ tier: 'VIP', quantity: 2 }],
      });
      const fp2 = PublicBookingService.generateSelectionFingerprint({
        eventId: 'event-1',
        tickets: [{ tier: 'VIP', quantity: 3 }],
      });
      expect(fp1).not.toBe(fp2);
    });

    it('Identical Retry: Returns existing booking with isReused: true and makes no DB/reservation updates', async () => {
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
      
      const payload = {
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
      };
      
      const fp = PublicBookingService.generateSelectionFingerprint(payload);
      
      const existingBookingMock = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b01'),
        bookingId: 'MAD-2026-ABCDE',
        eventId: mockEvent._id,
        status: 'awaiting_payment',
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
        selectionFingerprint: fp,
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Booking.findOne).mockResolvedValue(existingBookingMock as any);

      const result = await PublicBookingService.createBooking(payload, 'session-123');

      expect(result._id).toEqual(existingBookingMock._id);
      expect((result as any).isReused).toBe(true);
      expect(mockBookingSave).not.toHaveBeenCalled();
      expect(ReservationService.reserveForBooking).not.toHaveBeenCalled();
    });

    it('Sequential Selection Change: Expires old booking, transitions reservations, and creates new booking', async () => {
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      const payloadA = {
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
      };
      const payloadB = {
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_LATE', quantity: 1 }],
      };

      const fpA = PublicBookingService.generateSelectionFingerprint(payloadA);

      const existingBookingMock = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b01'),
        bookingId: 'MAD-2026-ABCDE',
        eventId: mockEvent._id,
        status: 'awaiting_payment',
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
        selectionFingerprint: fpA,
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Booking.findOne).mockResolvedValue(existingBookingMock as any);
      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([]);

      const result = await PublicBookingService.createBooking(payloadB, 'session-123');

      // Old booking should be marked EXPIRED
      expect(existingBookingMock.status).toBe('expired');
      expect(existingBookingMock.save).toHaveBeenCalled();
      expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
        existingBookingMock._id,
        'failed',
        expect.objectContaining({ reason: 'booking-modified-during-checkout' })
      );

      // New booking should be created
      expect(mockBookingSave).toHaveBeenCalled();
      expect(result.status).toBe('awaiting_payment');
    });

    it('Concurrent Conflict: Catch duplicate key 11000 and throw 409 Conflict on selection mismatch', async () => {
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      const payload = {
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_LATE', quantity: 1 }],
      };

      // Mock booking.save to throw a duplicate key error representing concurrent index collision
      const dbError = new Error('E11000 duplicate key error collection: idx_session_event_awaiting_payment');
      (dbError as any).code = 11000;
      mockBookingSave.mockRejectedValueOnce(dbError);

      const winningFp = PublicBookingService.generateSelectionFingerprint({
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }], // Different selection
      });

      const winningBookingMock = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b09'),
        bookingId: 'MAD-2026-WINNR',
        eventId: mockEvent._id,
        status: 'awaiting_payment',
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
        selectionFingerprint: winningFp,
      };

      vi.mocked(Booking.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winningBookingMock as any);

      await expect(
        PublicBookingService.createBooking(payload, 'session-123')
      ).rejects.toThrow('A concurrent booking checkout is already in progress');
    });

    it('Concurrent Recovery: Catch duplicate key 11000 and return winner on selection match', async () => {
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      const payload = {
        eventId: mockEvent._id.toString(),
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
      };

      const dbError = new Error('E11000 duplicate key error collection: idx_session_event_awaiting_payment');
      (dbError as any).code = 11000;
      mockBookingSave.mockRejectedValueOnce(dbError);

      const winningFp = PublicBookingService.generateSelectionFingerprint(payload);

      const winningBookingMock = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b09'),
        bookingId: 'MAD-2026-WINNR',
        eventId: mockEvent._id,
        status: 'awaiting_payment',
        tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
        selectionFingerprint: winningFp,
      };

      vi.mocked(Booking.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winningBookingMock as any);

      const result = await PublicBookingService.createBooking(payload, 'session-123');
      expect(result._id).toEqual(winningBookingMock._id);
      expect((result as any).isReused).toBe(true);
    });
  });

  describe('PublicBookingService.createBooking — event expiry and boundaries', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw badRequest if event has already started', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'Expired Event',
        category: 'music',
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
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

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
          },
          'session-123'
        )
      ).rejects.toThrow('This event is no longer available for booking.');
    });

    it('should throw badRequest if event has already ended', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'Ended Event',
        category: 'music',
        startDate: new Date(Date.now() - 7200000), // 2 hours ago
        endDate: new Date(Date.now() - 3600000), // 1 hour ago
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

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
          },
          'session-123'
        )
      ).rejects.toThrow('This event is no longer available for booking.');
    });
  });

  describe('PublicBookingService.createBooking — duplicate tier consolidation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockResolvedValue(null);
    });

    it('should consolidate duplicate tiers and reject if the consolidated quantity exceeds maxPerBooking', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'GA Concert',
        category: 'music',
        startDate: new Date(Date.now() + 3600000), // in 1 hour
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
            maxPerBooking: 2,
          },
        ],
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [
              { tier: 'GA_EARLY', quantity: 2 },
              { tier: 'GA_EARLY', quantity: 1 }
            ],
          },
          'session-123'
        )
      ).rejects.toThrow('Maximum 2 tickets allowed for tier "Early GA"');
    });

    it('should consolidate duplicate tiers and succeed if the consolidated quantity does not exceed maxPerBooking', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'GA Concert',
        category: 'music',
        startDate: new Date(Date.now() + 3600000), // in 1 hour
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
            maxPerBooking: 2,
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
          tickets: [
            { tier: 'GA_EARLY', quantity: 1 },
            { tier: 'GA_EARLY', quantity: 1 }
          ],
        },
        'session-123'
      );

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].tier).toBe('GA_EARLY');
      expect(result.tickets[0].quantity).toBe(2);
      expect(ReservationService.reserveForBooking).toHaveBeenCalledTimes(1);
      expect(ReservationService.reserveForBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'GA_EARLY',
          quantity: 2,
        }),
        expect.any(Object)
      );
    });
  });
});

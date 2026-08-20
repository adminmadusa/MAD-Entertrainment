import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    this.subtotal = data?.subtotal ?? 0;
    this.discount = data?.discount ?? 0;
    this.convenienceFee = data?.convenienceFee ?? 0;
    this.gst = data?.gst ?? 0;
    this.totalAmount = data?.totalAmount ?? 0;
    this.bookingVersion = 0;
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
    reserveForBooking: vi.fn().mockResolvedValue({ reservations: [], postCommit: vi.fn().mockResolvedValue(undefined) }),
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

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { ReservationService } from '../reservation.service';
import { PublicBookingService } from './booking.service';



// ─────────────────────────────────────────────────────────────
// getBookingByReference — ticketsReady
// ─────────────────────────────────────────────────────────────

  describe('PublicBookingService.createBooking — transactions & rollback', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockReset();
      mockBookingSave.mockClear();
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
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
  });


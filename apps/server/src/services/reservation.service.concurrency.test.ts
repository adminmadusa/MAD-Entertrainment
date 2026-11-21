import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_ADMIN_SECRET: '12345678901234567890123456789012',
    JWT_SESSION_SECRET: '12345678901234567890123456789012',
    REDIS_URL: 'redis://localhost:6379',
  })),
}));

const mockReservationSave = vi.fn();

vi.mock('../models/reservation.schema', () => {
  const MockReservationModel = vi.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockReservationSave;
    this.reservationId = data.reservationId || 'RSV-MOCK-1';
  });
  return {
    Reservation: MockReservationModel,
  };
});

vi.mock('../models/event.schema', () => ({
  Event: {
    findByIdAndUpdate: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), eventVersion: 2 }),
  },
}));

vi.mock('../config/redis', () => ({
  getRedis: vi.fn(() => ({
    eval: vi.fn().mockResolvedValue(1),
  })),
  releaseLockAtomic: vi.fn().mockResolvedValue(true),
}));

vi.mock('./cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../config/socket', () => ({
  emitToEvent: vi.fn(),
  emitToAdmin: vi.fn(),
}));

import { BookingMode, TicketTier } from '@mad/shared';
import { isSeatReservationCollision, ReservationService } from './reservation.service';

describe('Seat Reservation Duplicate-Key Collision Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReservationSave.mockReset();
  });

  describe('isSeatReservationCollision type guard', () => {
    it('strictly identifies MongoDB 11000 error with keyPattern containing eventId and seatId', () => {
      const err = {
        code: 11000,
        keyPattern: { eventId: 1, seatId: 1 },
        keyValue: { eventId: '654321098765432109876543', seatId: 'B-14' },
        message: 'E11000 duplicate key error collection: mad.reservations index: eventId_1_seatId_1 dup key: { eventId: ObjectId(...), seatId: "B-14" }',
      };

      expect(isSeatReservationCollision(err)).toBe(true);
    });

    it('identifies collision when keyPattern is ordered seatId then eventId', () => {
      const err = {
        code: '11000',
        keyPattern: { seatId: 1, eventId: 1 },
      };

      expect(isSeatReservationCollision(err)).toBe(true);
    });

    it('identifies collision when index name eventId_1_seatId_1 appears in error message with compound keyValue', () => {
      const err = {
        code: 11000,
        keyValue: { eventId: 'evt-1', seatId: 'A-1' },
        message: 'E11000 duplicate key error index: eventId_1_seatId_1 dup key',
      };

      expect(isSeatReservationCollision(err)).toBe(true);
    });

    it('rejects reservationId unique index collision (reservationId_1)', () => {
      const err = {
        code: 11000,
        keyPattern: { reservationId: 1 },
        keyValue: { reservationId: 'RSV-123456' },
        message: 'E11000 duplicate key error collection: mad.reservations index: reservationId_1 dup key: { reservationId: "RSV-123456" }',
      };

      expect(isSeatReservationCollision(err)).toBe(false);
    });

    it('rejects booking session checkout collision (idx_session_event_awaiting_payment)', () => {
      const err = {
        code: 11000,
        keyPattern: { sessionId: 1, eventId: 1 },
        keyValue: { sessionId: 'sess-123', eventId: 'evt-1' },
        message: 'E11000 duplicate key error index: idx_session_event_awaiting_payment',
      };

      expect(isSeatReservationCollision(err)).toBe(false);
    });

    it('rejects booking user checkout collision (idx_user_event_awaiting_payment)', () => {
      const err = {
        code: 11000,
        keyPattern: { userId: 1, eventId: 1 },
        keyValue: { userId: 'usr-123', eventId: 'evt-1' },
        message: 'E11000 duplicate key error index: idx_user_event_awaiting_payment',
      };

      expect(isSeatReservationCollision(err)).toBe(false);
    });

    it('rejects errors with keyValue.seatId alone without compound eventId or index signature', () => {
      const err = {
        code: 11000,
        keyValue: { seatId: 'A-1' }, // Missing eventId
        message: 'E11000 duplicate key error index: custom_seat_index',
      };

      expect(isSeatReservationCollision(err)).toBe(false);
    });

    it('rejects non-duplicate-key errors', () => {
      expect(isSeatReservationCollision(new Error('Validation failed'))).toBe(false);
      expect(isSeatReservationCollision({ code: 500, message: 'Internal error' })).toBe(false);
      expect(isSeatReservationCollision(null)).toBe(false);
      expect(isSeatReservationCollision(undefined)).toBe(false);
      expect(isSeatReservationCollision('string error')).toBe(false);
    });
  });

  describe('ReservationService.reserveForBooking — seat collisions', () => {
    const mockRequest = {
      eventId: new Types.ObjectId(),
      bookingMode: BookingMode.SEAT_BASED,
      tier: TicketTier.VIP,
      quantity: 1,
      seats: [{ seatId: 'A-1', section: 'VIP' }],
      sessionId: 'test-session-uuid',
      expiresAt: new Date(Date.now() + 600000),
      bookingId: new Types.ObjectId(),
    };

    it('translates verified eventId_1_seatId_1 duplicate key into domain HTTP 409 SEAT_ALREADY_RESERVED', async () => {
      const collisionErr = {
        code: 11000,
        keyPattern: { eventId: 1, seatId: 1 },
        keyValue: { eventId: mockRequest.eventId, seatId: 'A-1' },
        message: 'E11000 duplicate key error collection: mad.reservations index: eventId_1_seatId_1',
      };
      mockReservationSave.mockRejectedValueOnce(collisionErr);

      await expect(
        ReservationService.reserveForBooking(mockRequest as any)
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SEAT_ALREADY_RESERVED',
        message: expect.stringContaining('Seat A-1 is already reserved'),
      });
    });

    it('propagates unrelated duplicate key error without 409 mapping', async () => {
      const unrelated11000 = {
        code: 11000,
        keyPattern: { reservationId: 1 },
        keyValue: { reservationId: 'RSV-COLLIDE' },
        message: 'E11000 duplicate key error index: reservationId_1',
      };
      mockReservationSave.mockRejectedValueOnce(unrelated11000);

      await expect(
        ReservationService.reserveForBooking(mockRequest as any)
      ).rejects.not.toMatchObject({
        statusCode: 409,
        code: 'SEAT_ALREADY_RESERVED',
      });
    });

    it('propagates general database errors unchanged', async () => {
      mockReservationSave.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(
        ReservationService.reserveForBooking(mockRequest as any)
      ).rejects.toThrow('Connection lost');
    });
  });
});

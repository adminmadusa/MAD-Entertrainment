import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, ReservationStatus } from '@mad/shared';

import { emitToAdmin, emitToBooking } from '../../config/socket';
import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { auditLog } from '../../utils/audit';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';
import { expireBooking } from './booking.service';

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
    },
    startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
  };
});

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
  emitToBooking: vi.fn(),
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn().mockReturnValue({
      session: vi.fn().mockResolvedValue([]),
      lean: vi.fn().mockResolvedValue([]),
    }),
    updateMany: vi.fn().mockImplementation(() => {
      const q = Promise.resolve({ modifiedCount: 1 });
      (q as any).session = vi.fn().mockReturnValue(q);
      return q;
    }),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Admin Booking Service — Expiration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('expireBooking', () => {
    it('should expire booking, transition reservations, release capacity, and not send customer notifications', async () => {
      const mockBooking = {
        _id: 'booking-456',
        bookingId: 'MAD-2026-EXPIRE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.AWAITING_PAYMENT,
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-123', quantity: 2 }] as any);

      const result = await expireBooking('booking-456', 'Reservation timeout');

      expect(result.status).toBe(BookingStatus.EXPIRED);
      expect(mockBooking.save).toHaveBeenCalled();
      expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
        'booking-456',
        ReservationStatus.EXPIRED,
        expect.objectContaining({ reason: 'Reservation timeout' }),
        undefined
      );
      expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledWith(
        [{ reservationId: 'r-123', quantity: 2 }],
        undefined
      );

      expect(QueueService.enqueue).not.toHaveBeenCalled();

      expect(emitToBooking).toHaveBeenCalled();
      expect(emitToAdmin).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_EXPIRED',
          actor: { type: 'system', id: 'system' },
          status: 'success',
          metadata: expect.objectContaining({
            bookingId: 'booking-456',
            eventId: 'event-555',
          }),
        })
      );
    });

    it('should NOT decrement coupon usedCount when unconfirmed pending booking expires', async () => {
      const mockBooking = {
        _id: 'booking-coupon-expire',
        bookingId: 'MAD-2026-COUPEXP',
        eventId: 'event-555',
        totalTickets: 1,
        tickets: [{ tier: 'general', quantity: 1 }],
        status: BookingStatus.AWAITING_PAYMENT,
        couponId: 'coupon-expire-123',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(Coupon.updateOne).mockClear();

      await expireBooking('booking-coupon-expire', 'Timeout');

      expect(mockBooking.status).toBe(BookingStatus.EXPIRED);
      expect(Coupon.updateOne).not.toHaveBeenCalled();
    });

    it('should return null if booking is already EXPIRED', async () => {
      const mockBooking = {
        _id: 'booking-already-expired',
        bookingId: 'MAD-2026-ALREADY',
        eventId: 'event-555',
        status: BookingStatus.EXPIRED,
        tickets: [],
        bookingVersion: 3,
        save: vi.fn(),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      const result = await expireBooking('booking-already-expired');

      expect(result).toBeNull();
      expect(mockBooking.save).not.toHaveBeenCalled();
      expect(ReservationService.transitionForBooking).not.toHaveBeenCalled();
    });

    it('should throw badRequest if booking status cannot be expired (e.g. CONFIRMED)', async () => {
      const mockBooking = {
        _id: 'booking-confirmed',
        bookingId: 'MAD-2026-CONF',
        eventId: 'event-555',
        status: BookingStatus.CONFIRMED,
        tickets: [],
        bookingVersion: 2,
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      await expect(expireBooking('booking-confirmed')).rejects.toThrow('Cannot expire booking in status: confirmed');
    });
  });
});

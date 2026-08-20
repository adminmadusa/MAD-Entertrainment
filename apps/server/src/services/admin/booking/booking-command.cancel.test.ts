import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, ReservationStatus } from '@mad/shared';

import { emitToAdmin, emitToEvent, emitToBooking } from '../../../config/socket';
import { Booking } from '../../../models/booking.schema';
import { Coupon } from '../../../models/coupon.schema';
import { Event } from '../../../models/event.schema';
import { Notification } from '../../../models/notification.schema';
import { Payment } from '../../../models/payment.schema';
import { Ticket } from '../../../models/ticket.schema';
import { auditLog } from '../../../utils/audit';
import { CacheService } from '../../cache.service';
import { createNotificationSafe } from '../../notification.service';
import { QueueService } from '../../queue.service';
import { ReservationService } from '../../reservation.service';
import { cancelBooking, expireBooking } from './booking-command.service';

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

vi.mock('../../../models/coupon.schema', () => ({
  Coupon: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

const mockTicketFindQuery = {
  session: vi.fn().mockImplementation(function(_sess) {
    const p = Promise.resolve([]);
    (p as any).lean = vi.fn().mockResolvedValue([]);
    return p;
  }),
  lean: vi.fn().mockResolvedValue([]),
};
const mockTicketCountQuery = {
  session: vi.fn().mockResolvedValue(1),
};
const mockTicketExistsQuery = {
  session: vi.fn().mockResolvedValue(null),
};

vi.mock('../../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn().mockImplementation(() => mockTicketFindQuery),
    countDocuments: vi.fn().mockImplementation(() => mockTicketCountQuery),
    exists: vi.fn().mockImplementation(() => mockTicketExistsQuery),
    updateMany: vi.fn().mockImplementation(() => {
      const q = Promise.resolve({ modifiedCount: 1 });
      (q as any).session = vi.fn().mockReturnValue(q);
      return q;
    }),
    bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
  emitToBooking: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../models/payment.schema', () => ({
  Payment: {
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

describe('Admin Booking Cancellation & Expiry Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cancelBooking', () => {
    it('should cancel booking and update payment status to cancelled when targetStatus is CANCELLED', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        paymentId: 'payment-999',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await cancelBooking('booking-123', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockBooking.save).toHaveBeenCalled();
      expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
        'booking-123',
        'cancelled',
        expect.any(Object),
        undefined
      );
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-999',
        { status: 'cancelled' },
        { session: undefined }
      );
    });

    it('should NOT update payment status if targetStatus is not CANCELLED (e.g. REFUNDED)', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        paymentId: 'payment-999',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      const result = await cancelBooking('booking-123', 'Refund processed', undefined, BookingStatus.REFUNDED);

      expect(result.status).toBe(BookingStatus.REFUNDED);
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should not execute side effects if transaction fails', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        paymentId: 'payment-999',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      const mockSession = {
        withTransaction: vi.fn().mockRejectedValue(new Error('Database transaction abort')),
        endSession: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(mongoose.startSession).mockResolvedValueOnce(mockSession as any);

      await expect(cancelBooking('booking-123', 'Customer request')).rejects.toThrow('Database transaction abort');

      expect(CacheService.delPattern).not.toHaveBeenCalled();
      expect(emitToEvent).not.toHaveBeenCalled();
      expect(emitToBooking).not.toHaveBeenCalled();
      expect(emitToAdmin).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('should execute socket emissions and audit logging even if cache invalidation fails', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        paymentId: 'payment-999',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(CacheService.delPattern).mockRejectedValue(new Error('Cache error'));

      const result = await cancelBooking('booking-123', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(emitToBooking).toHaveBeenCalled();
      expect(emitToAdmin).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalled();
    });

    it('should skip email enqueueing if notification creation fails, but booking remains cancelled and logs are written', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        paymentId: 'payment-999',
        bookingVersion: 1,
        guestEmail: 'customer@example.com',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(Notification.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      vi.mocked(createNotificationSafe).mockRejectedValue(new Error('Notification DB write error'));

      const result = await cancelBooking('booking-123', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(QueueService.enqueue).not.toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalled();
    });

    it('should successfully decrement coupon usedCount when usedCount > 0 during cancelBooking', async () => {
      const mockBooking = {
        _id: 'booking-coupon-1',
        bookingId: 'MAD-2026-COUP1',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        couponId: 'coupon-123',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await cancelBooking('booking-coupon-1', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        { _id: 'coupon-123', usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        { session: undefined }
      );
    });

    it('should not decrement coupon usedCount if usedCount is already 0, and booking cancellation still succeeds', async () => {
      const mockBooking = {
        _id: 'booking-coupon-2',
        bookingId: 'MAD-2026-COUP2',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        couponId: 'coupon-456',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);

      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

      const result = await cancelBooking('booking-coupon-2', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        { _id: 'coupon-456', usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        { session: undefined }
      );
    });

    it('should preserve standard transaction rollback behavior on critical database failures', async () => {
      const mockBooking = {
        _id: 'booking-coupon-3',
        bookingId: 'MAD-2026-COUP3',
        eventId: 'event-555',
        totalTickets: 2,
        tickets: [{ tier: 'general', quantity: 2 }],
        status: BookingStatus.CONFIRMED,
        couponId: 'coupon-789',
        bookingVersion: 1,
        save: vi.fn().mockRejectedValue(new Error('Fatal database write error')),
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

      await expect(cancelBooking('booking-coupon-3', 'Customer request')).rejects.toThrow('Fatal database write error');
      expect(Coupon.updateOne).not.toHaveBeenCalled();
    });

    it('should correctly restore event capacity using quantity * groupSize for couple/group tickets', async () => {
      const mockBooking = {
        _id: 'booking-couple-123',
        bookingId: 'MAD-2026-COUPLE',
        eventId: 'event-couple-555',
        totalTickets: 2,
        tickets: [{ tier: 'couple', quantity: 1 }],
        status: BookingStatus.CONFIRMED,
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-couple-555',
        bookingMode: 'general_admission',
        ticketTiers: [
          { tier: 'couple', groupSize: 2, soldCount: 10, totalCapacity: 100 }
        ],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      const result = await cancelBooking('booking-couple-123', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'event-couple-555' },
        expect.objectContaining({
          $inc: expect.objectContaining({
            'ticketTiers.0.soldCount': -2,
            soldCount: -2,
          })
        }),
        expect.any(Object)
      );
    });

    it('should atomically void all active tickets associated with the booking', async () => {
      const mockBooking = {
        _id: 'booking-void-123',
        bookingId: 'MAD-2026-VOID',
        eventId: 'event-555',
        totalTickets: 1,
        tickets: [{ tier: 'general', quantity: 1 }],
        status: BookingStatus.CONFIRMED,
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

      const mockEvent = {
        _id: 'event-555',
        bookingMode: 'general_admission',
        ticketTiers: [{ tier: 'general', groupSize: 1, soldCount: 5 }],
      };
      vi.mocked(Event.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockEvent),
      } as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      await cancelBooking('booking-void-123', 'Cancel request');

      expect(Ticket.updateMany).toHaveBeenCalledWith(
        { bookingId: mockBooking._id, status: 'active' },
        { $set: { status: 'voided' } },
        { session: undefined }
      );
    });

    describe('PRICING-003 Scan Protection', () => {
      it('should block cancellation if any ticket is scanned and actor role is not super_admin', async () => {
        const mockBooking = {
          _id: 'booking-scanned-123',
          bookingId: 'MAD-2026-SCAN1',
          eventId: 'event-555',
          totalTickets: 2,
          tickets: [{ tier: 'general', quantity: 2 }],
          status: BookingStatus.CONFIRMED,
          bookingVersion: 1,
          save: vi.fn().mockResolvedValue(true),
        };

        vi.mocked(Booking.findById).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockBooking),
        } as any);

        vi.mocked(Ticket.find).mockImplementationOnce(() => ({
          session: vi.fn().mockResolvedValue([{ _id: 'ticket-scanned-1', scannedAt: new Date() }]),
        }) as any);

        const adminActor = { id: 'admin-001', role: 'admin' };

        await expect(
          cancelBooking('booking-scanned-123', 'Customer request', undefined, undefined, adminActor)
        ).rejects.toThrow('Cancellation blocked: Booking contains checked-in tickets');
      });

      it('should allow cancellation for super_admin even with scanned tickets, and log real actor id in audit log', async () => {
        const mockBooking = {
          _id: 'booking-scanned-456',
          bookingId: 'MAD-2026-SCAN2',
          eventId: 'event-555',
          totalTickets: 2,
          tickets: [{ tier: 'general', quantity: 2 }],
          status: BookingStatus.CONFIRMED,
          bookingVersion: 1,
          save: vi.fn().mockResolvedValue(true),
        };

        vi.mocked(Booking.findById).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockBooking),
        } as any);

        vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

        const mockEvent = { _id: 'event-555', bookingMode: 'general_admission', ticketTiers: [] };
        vi.mocked(Event.findById).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockEvent),
        } as any);

        const superAdminActor = { id: 'super-admin-001', role: 'super_admin' };

        const result = await cancelBooking('booking-scanned-456', 'Forced cancel', undefined, undefined, superAdminActor);

        expect(result.status).toBe(BookingStatus.CANCELLED);
        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'BOOKING_CANCELLED',
            actor: expect.objectContaining({ id: 'super-admin-001' }),
          })
        );
      });

      it('should allow cancellation when no actor is provided (internal/system calls bypass scan check)', async () => {
        const mockBooking = {
          _id: 'booking-scanned-789',
          bookingId: 'MAD-2026-SCAN3',
          eventId: 'event-555',
          totalTickets: 1,
          tickets: [{ tier: 'general', quantity: 1 }],
          status: BookingStatus.CONFIRMED,
          bookingVersion: 1,
          save: vi.fn().mockResolvedValue(true),
        };

        vi.mocked(Booking.findById).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockBooking),
        } as any);

        vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([] as any);

        const mockEvent = { _id: 'event-555', bookingMode: 'general_admission', ticketTiers: [] };
        vi.mocked(Event.findById).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockEvent),
        } as any);

        const result = await cancelBooking('booking-scanned-789', 'Internal refund processed');

        expect(result.status).toBe(BookingStatus.CANCELLED);
      });
    });
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingStatus, ReservationStatus } from '@mad/shared';
import { correctBookingEmail, resendBookingTickets, getBookingsSummary, cancelBooking, expireBooking } from './booking.service';
import { Booking } from '../../models/booking.schema';
import { UserModel } from '../../models/user.schema';
import { Ticket } from '../../models/ticket.schema';
import { Payment } from '../../models/payment.schema';
import { Event } from '../../models/event.schema';
import { Coupon } from '../../models/coupon.schema';

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    updateOne: vi.fn(),
  },
}));
import { ReservationService } from '../reservation.service';
import { CacheService } from '../cache.service';
import { QueueService } from '../queue.service';
import { auditLog } from '../../utils/audit';
import mongoose from 'mongoose';
import { createNotificationSafe } from '../notification.service';
import { Notification } from '../../models/notification.schema';
import { emitToAdmin, emitToEvent, emitToBooking } from '../../config/socket';

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

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    aggregate: vi.fn(),
  },
}));

const mockTicketFindQuery = {
  session: vi.fn().mockResolvedValue([]),
};
const mockTicketCountQuery = {
  session: vi.fn().mockResolvedValue(1),
};
const mockTicketExistsQuery = {
  session: vi.fn().mockResolvedValue(null),
};
vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn().mockImplementation(() => mockTicketFindQuery),
    countDocuments: vi.fn().mockImplementation(() => mockTicketCountQuery),
    exists: vi.fn().mockImplementation(() => mockTicketExistsQuery),
    aggregate: vi.fn(),
  },
}));

const mockAdminQuery = {
  session: vi.fn().mockResolvedValue({ name: 'Admin', email: 'admin@example.com' }),
  then: (resolve) => resolve({ name: 'Admin', email: 'admin@example.com' }),
};
vi.mock('../../models/admin.schema', () => ({
  AdminModel: {
    findById: vi.fn().mockImplementation(() => mockAdminQuery),
  },
}));

const mockAuditLogQuery = {
  sort: vi.fn().mockImplementation(() => ({
    lean: vi.fn().mockResolvedValue([]),
  })),
};
vi.mock('../../models/audit-log.schema', () => ({
  AuditLogModel: {
    find: vi.fn().mockImplementation(() => mockAuditLogQuery),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findOne: vi.fn(),
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

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    findByIdAndUpdate: vi.fn(),
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

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

describe('Admin Booking Service Backend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('correctBookingEmail', () => {
    it('should throw 404 if booking is not found', async () => {
      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        correctBookingEmail('booking-123', 'new@example.com', 'Correction reason', 'admin-id')
      ).rejects.toThrow('Booking not found');
    });

    it('should throw 403 if the booking already has a userId (authenticated checkout)', async () => {
      const mockBooking = {
        _id: 'booking-123',
        guestEmail: 'old@example.com',
        userId: 'user-789',
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      await expect(
        correctBookingEmail('booking-123', 'new@example.com', 'Correction reason', 'admin-id')
      ).rejects.toThrow('Authenticated bookings cannot have their email corrected');
    });

    it('should successfully update guestEmail for a guest booking', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        guestEmail: 'old@example.com',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await correctBookingEmail(
        'booking-123',
        'NEW@example.com ',
        'Correction reason',
        'admin-id'
      );

      expect(result.guestEmail).toBe('new@example.com');
      expect(result.bookingVersion).toBe(2);
      expect(mockBooking.save).toHaveBeenCalled();

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { type: 'admin', id: 'admin-id' },
          status: 'success',
          metadata: expect.objectContaining({
            bookingId: 'booking-123',
            oldEmail: 'old@example.com',
            newEmail: 'new@example.com',
            reason: 'Correction reason',
            proactivelyLinked: false,
          }),
        })
      );
    });

    it('should proactively link to existing user account if the corrected email already exists', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        guestEmail: 'old@example.com',
        bookingVersion: 1,
        userId: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockUser = {
        _id: 'user-999',
        email: 'existing-user@example.com',
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await correctBookingEmail(
        'booking-123',
        'existing-user@example.com',
        'Typo in domain',
        'admin-id'
      );

      expect(result.guestEmail).toBe('existing-user@example.com');
      expect(result.userId).toBe('user-999');
      expect(result.bookingVersion).toBe(2);
      expect(mockBooking.save).toHaveBeenCalled();

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { type: 'admin', id: 'admin-id' },
          status: 'success',
          metadata: expect.objectContaining({
            bookingId: 'booking-123',
            proactivelyLinked: true,
          }),
        })
      );
    });
  });

  describe('resendBookingTickets', () => {
    it('should throw 404 if booking is not found', async () => {
      vi.mocked(Booking.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(resendBookingTickets('booking-123', 'admin-id')).rejects.toThrow(
        'Booking not found'
      );
    });

    it('should throw 400 if booking is not in CONFIRMED status', async () => {
      const mockBooking = {
        _id: 'booking-123',
        status: BookingStatus.AWAITING_PAYMENT,
      };

      vi.mocked(Booking.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      await expect(resendBookingTickets('booking-123', 'admin-id')).rejects.toThrow(
        /Cannot resend tickets/
      );
    });

    it('should enqueue a job in pdf-queue and write audit log on success', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        status: BookingStatus.CONFIRMED,
        guestEmail: 'guest@example.com',
        guestName: 'John Doe',
        eventId: {
          _id: 'event-555',
        },
      };

      vi.mocked(Booking.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      const result = await resendBookingTickets('booking-123', 'admin-id');

      expect(result).toBe(mockBooking);
      expect(QueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'pdf:generate',
        {
          bookingId: 'booking-123',
          eventId: 'event-555',
          recipientEmail: 'guest@example.com',
          guestName: 'John Doe',
          isResend: true,
          resendId: expect.any(String),
        },
        expect.stringContaining('pdf-generate-booking-123-admin-resend-')
      );

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_TICKETS_RESENT',
          actor: { type: 'admin', id: 'admin-id' },
          status: 'success',
          metadata: expect.objectContaining({
            bookingId: 'booking-123',
            recipientEmail: 'guest@example.com',
          }),
        })
      );
    });
  });

  describe('getBookingsSummary', () => {
    it('should return cached summary if available', async () => {
      const mockCachedData = {
        totalBookings: 10,
        totalTickets: 20,
        revenue: 5000,
        confirmed: 8,
        pending: 1,
        cancelled: 1,
        checkedIn: 5,
      };

      vi.mocked(CacheService.get).mockResolvedValue(mockCachedData);

      const result = await getBookingsSummary();

      expect(CacheService.get).toHaveBeenCalledWith('bookings:summary:global');
      expect(result).toEqual(mockCachedData);
      expect(Booking.aggregate).not.toHaveBeenCalled();
    });

    it('should run aggregation and calculate stats globally when no eventId is provided', async () => {
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValue([
        {
          totalBookings: 15,
          totalTickets: 30,
          revenue: 15000,
          confirmed: 10,
          pending: 3,
          cancelled: 2,
        },
      ]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        {
          checkedIn: 12,
        },
      ]);

      const result = await getBookingsSummary();

      expect(CacheService.get).toHaveBeenCalledWith('bookings:summary:global');
      expect(Booking.aggregate).toHaveBeenCalled();
      expect(Ticket.aggregate).toHaveBeenCalledWith([
        { $match: { scannedAt: { $ne: null } } },
        { $group: { _id: null, checkedIn: { $sum: '$admits' } } },
      ]);
      expect(CacheService.set).toHaveBeenCalledWith('bookings:summary:global', result, 60);
      expect(result).toEqual({
        totalBookings: 15,
        totalTickets: 30,
        revenue: 15000,
        confirmed: 10,
        pending: 3,
        cancelled: 2,
        checkedIn: 12,
      });
    });

    it('should run aggregation filtered by eventId when provided', async () => {
      const eventId = '507f1f77bcf86cd799439011';
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValue([
        {
          totalBookings: 5,
          totalTickets: 10,
          revenue: 5000,
          confirmed: 4,
          pending: 1,
          cancelled: 0,
        },
      ]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        {
          checkedIn: 6,
        },
      ]);

      const result = await getBookingsSummary(eventId);

      expect(CacheService.get).toHaveBeenCalledWith(`bookings:summary:event:${eventId}`);
      expect(Booking.aggregate).toHaveBeenCalled();
      expect(Ticket.aggregate).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalledWith(`bookings:summary:event:${eventId}`, result, 60);
      expect(result.checkedIn).toBe(6);
    });

    it('should fall back to 0 values if aggregation returns empty results', async () => {
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValue([]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([]);

      const result = await getBookingsSummary();

      expect(result).toEqual({
        totalBookings: 0,
        totalTickets: 0,
        revenue: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        checkedIn: 0,
      });
    });
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

      // Simulate a startSession succeeding but withTransaction throwing (transaction failure)
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

      // CacheService.delPattern fails
      vi.mocked(CacheService.delPattern).mockRejectedValue(new Error('Cache error'));

      const result = await cancelBooking('booking-123', 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      // Verify other side-effects still ran
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

      // Notification.findOne returns null
      vi.mocked(Notification.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      // createNotificationSafe throws error
      vi.mocked(createNotificationSafe).mockRejectedValue(new Error('Notification DB write error'));

      const result = await cancelBooking('booking-123', 'Customer request');

      // Booking cancellation should still succeed
      expect(result.status).toBe(BookingStatus.CANCELLED);

      // QueueService should NOT be called to enqueue email dispatch job
      expect(QueueService.enqueue).not.toHaveBeenCalled();

      // Ensure other side effects like auditLog still executed
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

      // Mongoose updateOne returns modifiedCount: 0 when query doesn't match usedCount > 0
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

      // Verify no customer notification is queued
      expect(QueueService.enqueue).not.toHaveBeenCalled();

      // Verify socket emissions and audit log
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

    it('should decrement coupon usedCount with gt 0 guard if coupon is present', async () => {
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

      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      await expireBooking('booking-coupon-expire', 'Timeout');

      expect(Coupon.updateOne).toHaveBeenCalledWith(
        { _id: 'coupon-expire-123', usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        { session: undefined }
      );
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

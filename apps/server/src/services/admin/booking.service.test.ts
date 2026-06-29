import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingStatus, ReservationStatus } from '@mad/shared';
import { correctBookingEmail, resendBookingTickets, getBookingsSummary, cancelBooking, expireBooking, getBookings, getBookingById } from './booking.service';
import { Booking } from '../../models/booking.schema';
import { UserModel } from '../../models/user.schema';
import { Ticket } from '../../models/ticket.schema';
import { Payment } from '../../models/payment.schema';
import { Event } from '../../models/event.schema';
import { Coupon } from '../../models/coupon.schema';
import { Refund } from '../../models/refund.schema';
import { AuditLogModel } from '../../models/audit-log.schema';

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
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

const mockTicketFindQuery = {
  session: vi.fn().mockImplementation(function(sess) {
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
const mockTicketUpdateManyQuery = Promise.resolve({ modifiedCount: 1 });
vi.mock('../../models/ticket.schema', () => ({
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
    aggregate: vi.fn(),
  },
}));

const mockAdminQuery = {
  session: vi.fn().mockImplementation(function() { return this; }),
  lean: vi.fn().mockResolvedValue({ name: 'Admin', email: 'admin@example.com' }),
  then: function(resolve) { return resolve({ name: 'Admin', email: 'admin@example.com' }); },
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
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    aggregate: vi.fn(),
    find: vi.fn().mockImplementation(() => {
      const q = Promise.resolve([]);
      (q as any).session = vi.fn().mockReturnValue(q);
      return q;
    }),
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

    it('should replace active tickets in batch using bulkWrite and insertMany', async () => {
      const mockBooking = {
        _id: 'booking-abc',
        bookingId: 'MAD-2026-BATCH',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockTickets = [
        { _id: 'tid-1', ticketId: 'TKT-MAD-001', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
        { _id: 'tid-2', ticketId: 'TKT-MAD-002', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
        { _id: 'tid-3', ticketId: 'TKT-MAD-003', status: 'replaced', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
      ];

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);

      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      // Ticket.find().session().lean() returns all 3 tickets (2 active, 1 replaced)
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(mockTickets),
        })),
      }) as any);

      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 2 } as any);
      vi.mocked(Ticket.insertMany).mockResolvedValueOnce([{}, {}] as any);

      await correctBookingEmail('booking-abc', 'new@example.com', 'Correction', 'admin-id');

      // Query count verification: exactly 1 find, 1 bulkWrite, 1 insertMany
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(Ticket.bulkWrite).toHaveBeenCalledTimes(1);
      expect(Ticket.insertMany).toHaveBeenCalledTimes(1);

      // Verify bulkWrite payload targets correct ticket _ids
      const bulkWriteArgs = vi.mocked(Ticket.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArgs).toHaveLength(2);
      expect(bulkWriteArgs[0].updateOne.filter._id).toBe('tid-1');
      expect(bulkWriteArgs[1].updateOne.filter._id).toBe('tid-2');

      // Verify bulkWrite update payload field parity
      const update0 = bulkWriteArgs[0].updateOne.update.$set;
      expect(update0.status).toBe('replaced');
      expect(update0.replacedByTicketId).toBe('TKT-MAD-001-R1');
      expect(update0.replacedAt).toBeInstanceOf(Date);
      expect(update0.replacementReason).toBe('EMAIL_CORRECTION');
      expect(update0.updatedAt).toBeInstanceOf(Date);

      // Verify revision IDs are generated sequentially
      const insertManyArgs = vi.mocked(Ticket.insertMany).mock.calls[0][0] as any[];
      expect(insertManyArgs[0].ticketId).toBe('TKT-MAD-001-R1');
      expect(insertManyArgs[1].ticketId).toBe('TKT-MAD-002-R1');
    });

    it('should verify that both bulkWrite and insertMany receive the transaction session', async () => {
      const mockBooking = {
        _id: 'booking-session-test',
        bookingId: 'MAD-2026-SESS',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockTickets = [
        { _id: 'tid-1', ticketId: 'TKT-MAD-001', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
      ];

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(mockTickets),
        })),
      }) as any);
      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 1 } as any);
      vi.mocked(Ticket.insertMany).mockResolvedValueOnce([{}] as any);

      // Simulate a real session object being passed through
      const fakeSession = { id: 'fake-session-obj' };
      vi.mocked(mongoose.startSession).mockResolvedValueOnce({
        withTransaction: vi.fn().mockImplementation(async (fn) => fn()),
        endSession: vi.fn().mockResolvedValue(undefined),
      } as any);

      await correctBookingEmail('booking-session-test', 'new@example.com', 'Correction', 'admin-id');

      // Session propagation: both batch operations must receive a session option
      expect(Ticket.bulkWrite).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ session: expect.anything() })
      );
      expect(Ticket.insertMany).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ session: expect.anything() })
      );
    });

    it('should throw and roll back if bulkWrite modifiedCount does not match expected ticket count', async () => {
      const mockBooking = {
        _id: 'booking-mismatch',
        bookingId: 'MAD-2026-MISM',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockTickets = [
        { _id: 'tid-1', ticketId: 'TKT-MAD-001', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
        { _id: 'tid-2', ticketId: 'TKT-MAD-002', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
      ];

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(mockTickets),
        })),
      }) as any);

      // Simulate partial bulkWrite update — only 1 modified instead of 2
      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      await expect(
        correctBookingEmail('booking-mismatch', 'new@example.com', 'Correction', 'admin-id')
      ).rejects.toThrow(/Bulk write mismatch/);

      // insertMany must NOT have been called if bulkWrite already failed
      expect(Ticket.insertMany).not.toHaveBeenCalled();
    });

    it('should throw and roll back if insertMany fails', async () => {
      const mockBooking = {
        _id: 'booking-insert-fail',
        bookingId: 'MAD-2026-INSFAIL',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockTickets = [
        { _id: 'tid-1', ticketId: 'TKT-MAD-001', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
      ];

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(mockTickets),
        })),
      }) as any);
      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 1 } as any);
      // Simulate E11000-style duplicate key error from insertMany
      vi.mocked(Ticket.insertMany).mockRejectedValueOnce(
        Object.assign(new Error('E11000 duplicate key error'), { code: 11000 })
      );

      await expect(
        correctBookingEmail('booking-insert-fail', 'new@example.com', 'Correction', 'admin-id')
      ).rejects.toThrow(/E11000|duplicate key/);

      // Side effects must not have fired
      expect(auditLog).not.toHaveBeenCalled();
      expect(emitToBooking).not.toHaveBeenCalled();
      expect(emitToAdmin).not.toHaveBeenCalled();
    });

    it('should not affect tickets belonging to other bookings', async () => {
      const mockBooking = {
        _id: 'booking-target',
        bookingId: 'MAD-2026-TARGET',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      // Only the target booking's tickets are returned by Ticket.find
      const targetTickets = [
        { _id: 'tid-target-1', ticketId: 'TKT-MAD-010', status: 'active', eventId: 'event-1', tierName: 'General', tier: 'general', admits: 1 },
      ];

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(targetTickets),
        })),
      }) as any);
      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 1 } as any);
      vi.mocked(Ticket.insertMany).mockResolvedValueOnce([{}] as any);

      await correctBookingEmail('booking-target', 'new@example.com', 'Correction', 'admin-id');

      // Ticket.find was called exactly once with only the target booking's _id
      expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });

      // bulkWrite only targets the single ticket belonging to the target booking
      const bulkWriteArgs = vi.mocked(Ticket.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArgs).toHaveLength(1);
      expect(bulkWriteArgs[0].updateOne.filter._id).toBe('tid-target-1');
    });

    it('should correctly compute revision numbers in memory for large bookings (100+ tickets)', async () => {
      const mockBooking = {
        _id: 'booking-large',
        bookingId: 'MAD-2026-LARGE',
        guestEmail: 'bulk@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      const ticketCount = 100;
      const largeTickets = Array.from({ length: ticketCount }, (_, i) => ({
        _id: `tid-${i + 1}`,
        ticketId: `TKT-MAD-${String(i + 1).padStart(3, '0')}`,
        status: 'active',
        eventId: 'event-1',
        tierName: 'General',
        tier: 'general',
        admits: 1,
      }));

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(largeTickets),
        })),
      }) as any);
      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: ticketCount } as any);
      vi.mocked(Ticket.insertMany).mockResolvedValueOnce(
        Array.from({ length: ticketCount }, () => ({})) as any
      );

      await correctBookingEmail('booking-large', 'new-bulk@example.com', 'Bulk correction', 'admin-id');

      // Constant O(1) DB round-trips regardless of ticket count
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(Ticket.bulkWrite).toHaveBeenCalledTimes(1);
      expect(Ticket.insertMany).toHaveBeenCalledTimes(1);

      // All 100 update ops sent in one call, all with unique -R1 revision IDs
      const bulkWriteArgs = vi.mocked(Ticket.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArgs).toHaveLength(ticketCount);

      const insertManyArgs = vi.mocked(Ticket.insertMany).mock.calls[0][0] as any[];
      expect(insertManyArgs).toHaveLength(ticketCount);

      // Verify all replacement ticket IDs are unique
      const newTicketIds = insertManyArgs.map((t: any) => t.ticketId);
      const uniqueIds = new Set(newTicketIds);
      expect(uniqueIds.size).toBe(ticketCount);

      // Verify all new IDs follow the -R1 revision pattern
      expect(newTicketIds.every((id: string) => id.endsWith('-R1'))).toBe(true);
    });

    it('should emit side effects only after transaction resolves, never before', async () => {
      const mockBooking = {
        _id: 'booking-ordering',
        bookingId: 'MAD-2026-ORDER',
        guestEmail: 'old@example.com',
        eventId: 'event-1',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Booking.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(UserModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      const callOrder: string[] = [];

      vi.mocked(emitToBooking).mockImplementation(() => {
        callOrder.push('emitToBooking');
      });
      vi.mocked(emitToAdmin).mockImplementation(() => {
        callOrder.push('emitToAdmin');
      });
      vi.mocked(auditLog).mockImplementation(() => {
        callOrder.push('auditLog');
      });

      await correctBookingEmail('booking-ordering', 'new@example.com', 'Correction', 'admin-id');

      // All side effects must have been called after transaction completes
      expect(callOrder).toContain('emitToBooking');
      expect(callOrder).toContain('emitToAdmin');
      expect(callOrder).toContain('auditLog');

      // auditLog must fire before socket emissions (executeCorrectEmailSideEffects order)
      const auditIdx = callOrder.indexOf('auditLog');
      const socketIdx = callOrder.indexOf('emitToBooking');
      expect(auditIdx).toBeGreaterThanOrEqual(0);
      expect(socketIdx).toBeGreaterThanOrEqual(0);
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
        grossRevenue: 5000,
        refundAmount: 1000,
        netRevenue: 4000,
        revenue: 4000,
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
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([
        {
          totalBookings: 15,
          totalTickets: 30,
          confirmed: 10,
          pending: 3,
          cancelled: 2,
        },
      ]);
      vi.mocked(Payment.aggregate).mockResolvedValueOnce([
        {
          totalGross: 15000,
        },
      ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([
        {
          totalRefunded: 2000,
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
        grossRevenue: 15000,
        refundAmount: 2000,
        netRevenue: 13000,
        revenue: 13000,
        confirmed: 10,
        pending: 3,
        cancelled: 2,
        checkedIn: 12,
      });
    });

    it('should run aggregation filtered by eventId when provided', async () => {
      const eventId = '507f1f77bcf86cd799439011';
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([
        {
          totalBookings: 5,
          totalTickets: 10,
          confirmed: 4,
          pending: 1,
          cancelled: 0,
        },
      ]);
      vi.mocked(Payment.aggregate).mockResolvedValueOnce([
        {
          totalGross: 5000,
        },
      ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([
        {
          totalRefunded: 500,
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
      expect(result.grossRevenue).toBe(5000);
      expect(result.refundAmount).toBe(500);
      expect(result.netRevenue).toBe(4500);
    });

    it('should fall back to 0 values if aggregation returns empty results', async () => {
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValue([]);
      vi.mocked(Payment.aggregate).mockResolvedValue([]);
      vi.mocked(Refund.aggregate).mockResolvedValue([]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([]);

      const result = await getBookingsSummary();

      expect(result).toEqual({
        totalBookings: 0,
        totalTickets: 0,
        grossRevenue: 0,
        refundAmount: 0,
        netRevenue: 0,
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

        // Override Ticket.find once to return a scanned ticket
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

        // No actor = internal call (e.g., from processRefund after super_admin-validated override)
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

  describe('PERF-001: getBookings and getBookingById DTO Parity & Performance Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should retrieve paginated bookings list and match DTO payload schema contract', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();
      
      const mockBookings = [
        {
          _id: mockBookingId,
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          tickets: [{ tier: 'general', tierName: 'General', quantity: 2, pricePerTicket: 100, subtotal: 200 }],
          totalTickets: 2,
          totalAmount: 200,
          currency: 'INR',
          createdAt: new Date('2026-06-28T10:00:00Z'),
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestPhone: '+919876543210',
          eventId: {
            _id: mockEventId,
            title: 'Sample Concert',
            startDate: new Date('2026-07-01T12:00:00Z'),
            bookingMode: 'general_admission',
          },
        }
      ];

      const mockTickets = [
        {
          ticketId: 'TCK-1',
          bookingId: mockBookingId,
          status: 'active',
          createdAt: new Date('2026-06-28T10:05:00Z'),
          admits: 1,
        }
      ];

      const mockAuditLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date('2026-06-28T10:10:00Z'),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Corrected email',
        }
      ];

      // Mock Mongoose calls for getBookings
      vi.mocked(Booking.countDocuments).mockResolvedValue(1);
      
      const mockLean = vi.fn().mockResolvedValue(mockBookings);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockAuditLogs),
        }),
      } as any);

      // Perform request
      const result = await getBookings(1, 10);

      // Verify DB queries count (1 count, 1 find, 1 tickets, 1 audit logs = 4 queries total)
      expect(Booking.countDocuments).toHaveBeenCalledTimes(1);
      expect(Booking.find).toHaveBeenCalledTimes(1);
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(AuditLogModel.find).toHaveBeenCalledTimes(1);

      // Strengthen Performance Verification: Verify that the bulk-loading strategy is used
      expect(AuditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { 'metadata.bookingId': { $in: [mockBookingId.toString()] } },
            { 'metadata.bookingReference': { $in: ['MAD-2026-TEST1'] } }
          ],
          action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] }
        }),
        expect.objectContaining({
          _id: 1,
          action: 1,
          actor: 1,
          status: 1,
          createdAt: 1,
          metadata: 1,
          description: 1
        })
      );

      // Verify payload structure parity via maintainable matchers (Omit fragile full-object exact comparisons)
      expect(result.data).toHaveLength(1);
      const dto = result.data[0];
      
      expect(dto).toEqual(
        expect.objectContaining({
          _id: mockBookingId.toString(),
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          totalAmount: 200,
          currency: 'INR',
          mode: 'general_admission',
          totalTickets: 1,
          ticketsScanned: 0,
          ticketsRemaining: 1,
          attendanceStatus: 'NOT_ATTENDED',
        })
      );

      expect(dto.eventId).toEqual(
        expect.objectContaining({
          _id: mockEventId.toString(),
          title: 'Sample Concert',
        })
      );

      expect(dto.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tierName: 'General', quantity: 2, price: 100 })
        ])
      );

      expect(dto.auditHistory).toEqual([
        expect.objectContaining({
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: 'admin-1',
          status: 'success',
          description: 'Corrected email',
        })
      ]);

      expect(dto.individualTickets).toEqual([
        expect.objectContaining({
          ticketId: 'TCK-1',
          status: 'active',
        })
      ]);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should retrieve a single booking by ID with pre-loaded logs and tickets', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();
      
      const mockBooking = {
        _id: mockBookingId,
        bookingId: 'MAD-2026-TEST1',
        status: BookingStatus.CONFIRMED,
        tickets: [{ tier: 'general', tierName: 'General', quantity: 2, pricePerTicket: 100, subtotal: 200 }],
        totalTickets: 2,
        totalAmount: 200,
        currency: 'INR',
        createdAt: new Date('2026-06-28T10:00:00Z'),
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '+919876543210',
        eventId: {
          _id: mockEventId,
          title: 'Sample Concert',
          startDate: new Date('2026-07-01T12:00:00Z'),
          bookingMode: 'general_admission',
        },
      };

      const mockTickets = [
        {
          ticketId: 'TCK-1',
          bookingId: mockBookingId,
          status: 'active',
          createdAt: new Date('2026-06-28T10:05:00Z'),
          admits: 1,
        }
      ];

      const mockAuditLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date('2026-06-28T10:10:00Z'),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Corrected email',
        }
      ];

      const mockLean = vi.fn().mockResolvedValue(mockBooking);
      const mockFindOnePopulate = vi.fn().mockReturnValue({
        lean: mockLean,
      });
      vi.mocked(Booking.findOne).mockReturnValue({
        populate: mockFindOnePopulate,
      } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockAuditLogs),
        }),
      } as any);

      const result = await getBookingById(mockBookingId.toString());

      expect(Booking.findOne).toHaveBeenCalledTimes(1);
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(AuditLogModel.find).toHaveBeenCalledTimes(1);
      
      expect(result).toEqual(
        expect.objectContaining({
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          totalAmount: 200,
        })
      );
    });

    it('should pass regression tests for guest, authenticated, cancelled bookings, replaced tickets, and empty sets', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();
      
      const mockBookings = [
        {
          _id: mockBookingId,
          bookingId: 'MAD-2026-REG1',
          status: BookingStatus.CANCELLED,
          tickets: [],
          totalTickets: 0,
          totalAmount: 0,
          currency: 'INR',
          createdAt: new Date('2026-06-28T10:00:00Z'),
          guestName: 'Guest Customer',
          guestEmail: 'guest@example.com',
          guestPhone: '+919876543219',
          cancellationReason: 'User cancelled',
          cancelledAt: new Date('2026-06-28T11:00:00Z'),
          eventId: {
            _id: mockEventId,
            title: 'Sample Concert',
            startDate: new Date('2026-07-01T12:00:00Z'),
            bookingMode: 'general_admission',
          },
        }
      ];

      vi.mocked(Booking.countDocuments).mockResolvedValue(1);

      const mockLean = vi.fn().mockResolvedValue(mockBookings);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(1);
      const dto = result.data[0];
      expect(dto.userId).toBeNull();
      expect(dto.guestInfo).toEqual(expect.objectContaining({
        email: 'guest@example.com',
        name: 'Guest Customer',
      }));
      expect(dto.status).toBe(BookingStatus.CANCELLED);
      expect(dto.cancellationReason).toBe('User cancelled');
      expect(dto.cancelledAt).toBeDefined();
      expect(dto.auditHistory).toHaveLength(0);
      expect(dto.tickets).toHaveLength(0);
    });

    it('should dynamically verify projection coverage against mapper requirements', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();
      
      const projectedBookingOnly = {
        _id: mockBookingId,
        bookingId: 'MAD-2026-PROJ1',
        status: BookingStatus.CONFIRMED,
        totalAmount: 100,
        currency: 'INR',
        eventId: {
          _id: mockEventId,
          title: 'Concert',
          startDate: new Date(),
          bookingMode: 'general_admission',
        },
        userId: new mongoose.Types.ObjectId(),
        guestName: 'Test',
        firstName: 'Test',
        lastName: 'User',
        guestEmail: 'test@example.com',
        guestPhone: '+919999999999',
        keepUpdated: true,
        sendBestEvents: false,
        tickets: [
          {
            tierName: 'General',
            quantity: 1,
            pricePerTicket: 100,
            seats: []
          }
        ],
        createdAt: new Date(),
        cancellationReason: undefined,
        cancelledAt: undefined,
      };

      const mockTickets = [
        {
          ticketId: 'T-1',
          bookingId: mockBookingId,
          status: 'replaced',
          createdAt: new Date(),
          replacedAt: new Date(),
          replacedByTicketId: 'T-2',
          replacementReason: 'EMAIL_CORRECTION',
          admits: 1,
        }
      ];

      const mockLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date(),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Updated email',
        }
      ];

      vi.mocked(Booking.countDocuments).mockResolvedValue(1);

      const mockLean = vi.fn().mockResolvedValue([projectedBookingOnly]);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockLogs),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(1);
      const mapped = result.data[0];
      expect(mapped._id).toBe(mockBookingId.toString());
      expect(mapped.individualTickets[0].replacedByTicketId).toBe('T-2');
      expect(mapped.individualTickets[0].replacementReason).toBe('EMAIL_CORRECTION');
    });

    it('should return empty pagination response when no bookings are found', async () => {
      vi.mocked(Booking.countDocuments).mockResolvedValue(0);

      const mockLean = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    });
  });
});

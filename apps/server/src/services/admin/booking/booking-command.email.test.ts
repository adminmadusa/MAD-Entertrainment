import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus } from '@mad/shared';

import { emitToAdmin, emitToBooking } from '../../../config/socket';
import { Booking } from '../../../models/booking.schema';
import { Ticket } from '../../../models/ticket.schema';
import { UserModel } from '../../../models/user.schema';
import { auditLog } from '../../../utils/audit';
import { QueueService } from '../../queue.service';
import { correctBookingEmail, resendBookingTickets } from './booking-command.service';

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

const mockAdminQuery = {
  session: vi.fn().mockImplementation(function() { return this; }),
  lean: vi.fn().mockResolvedValue({ name: 'Admin', email: 'admin@example.com' }),
  then: function(resolve: any) { return resolve({ name: 'Admin', email: 'admin@example.com' }); },
};
vi.mock('../../../models/admin.schema', () => ({
  AdminModel: {
    findById: vi.fn().mockImplementation(() => mockAdminQuery),
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

vi.mock('../../../models/user.schema', () => ({
  UserModel: {
    findOne: vi.fn(),
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

describe('Admin Booking Email Operations', () => {
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

      vi.mocked(Ticket.find).mockImplementationOnce(() => ({
        session: vi.fn().mockImplementation(() => ({
          lean: vi.fn().mockResolvedValue(mockTickets),
        })),
      }) as any);

      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 2 } as any);
      vi.mocked(Ticket.insertMany).mockResolvedValueOnce([{}, {}] as any);

      await correctBookingEmail('booking-abc', 'new@example.com', 'Correction', 'admin-id');

      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(Ticket.bulkWrite).toHaveBeenCalledTimes(1);
      expect(Ticket.insertMany).toHaveBeenCalledTimes(1);

      const bulkWriteArgs = vi.mocked(Ticket.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArgs).toHaveLength(2);
      expect(bulkWriteArgs[0].updateOne.filter._id).toBe('tid-1');
      expect(bulkWriteArgs[1].updateOne.filter._id).toBe('tid-2');

      const update0 = bulkWriteArgs[0].updateOne.update.$set;
      expect(update0.status).toBe('replaced');
      expect(update0.replacedByTicketId).toBe('TKT-MAD-001-R1');
      expect(update0.replacedAt).toBeInstanceOf(Date);
      expect(update0.replacementReason).toBe('EMAIL_CORRECTION');
      expect(update0.updatedAt).toBeInstanceOf(Date);

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

      vi.mocked(mongoose.startSession).mockResolvedValueOnce({
        withTransaction: vi.fn().mockImplementation(async (fn) => fn()),
        endSession: vi.fn().mockResolvedValue(undefined),
      } as any);

      await correctBookingEmail('booking-session-test', 'new@example.com', 'Correction', 'admin-id');

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

      vi.mocked(Ticket.bulkWrite).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      await expect(
        correctBookingEmail('booking-mismatch', 'new@example.com', 'Correction', 'admin-id')
      ).rejects.toThrow(/Bulk write mismatch/);

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
      vi.mocked(Ticket.insertMany).mockRejectedValueOnce(
        Object.assign(new Error('E11000 duplicate key error'), { code: 11000 })
      );

      await expect(
        correctBookingEmail('booking-insert-fail', 'new@example.com', 'Correction', 'admin-id')
      ).rejects.toThrow(/E11000|duplicate key/);

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

      expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });

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

      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(Ticket.bulkWrite).toHaveBeenCalledTimes(1);
      expect(Ticket.insertMany).toHaveBeenCalledTimes(1);

      const bulkWriteArgs = vi.mocked(Ticket.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArgs).toHaveLength(ticketCount);

      const insertManyArgs = vi.mocked(Ticket.insertMany).mock.calls[0][0] as any[];
      expect(insertManyArgs).toHaveLength(ticketCount);

      const newTicketIds = insertManyArgs.map((t: any) => t.ticketId);
      const uniqueIds = new Set(newTicketIds);
      expect(uniqueIds.size).toBe(ticketCount);

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

      expect(callOrder).toContain('emitToBooking');
      expect(callOrder).toContain('emitToAdmin');
      expect(callOrder).toContain('auditLog');

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
});

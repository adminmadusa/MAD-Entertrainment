import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingStatus } from '@mad/shared';
import { correctBookingEmail, resendBookingTickets } from './booking.service';
import { Booking } from '../../models/booking.schema';
import { UserModel } from '../../models/user.schema';
import { QueueService } from '../queue.service';
import { auditLog } from '../../utils/audit';

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

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
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

    it('should successfully update guestEmail and guestEmailConfirm for a guest booking', async () => {
      const mockBooking = {
        _id: 'booking-123',
        bookingId: 'MAD-2026-ABCDE',
        guestEmail: 'old@example.com',
        guestEmailConfirm: 'old@example.com',
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
      expect(result.guestEmailConfirm).toBe('new@example.com');
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
        guestEmailConfirm: 'old@example.com',
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
        },
        expect.stringContaining('pdf:generate:booking-123:admin-resend:')
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

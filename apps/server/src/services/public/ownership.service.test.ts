import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingStatus } from '@mad/shared';

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret32characterstestsecret32',
    JWT_ADMIN_SECRET: 'testsecret32characterstestsecret32',
    JWT_SESSION_SECRET: 'testsecret32characterstestsecret32',
    DLQ_ENCRYPTION_KEY: 'testsecret32characterstestsecret32',
    BOOKING_OWNERSHIP_GRACE_MS: 600000,
  }),
}));

import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import {
  assertPurchaserOwnsTicket,
  assertAttendeeOwnsTicket,
  canViewTicketQR,
  canDownloadTicketPDF,
} from './ticket-ownership.service';

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

describe('Ticket Ownership Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assertPurchaserOwnsTicket', () => {
    it('throws 404 if ticket not found', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue(null);
      await expect(assertPurchaserOwnsTicket('t1', 'u1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404, message: 'Ticket not found' })
      );
    });

    it('throws 404 if booking not found', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue({ bookingId: 'b1' } as any);
      vi.mocked(Booking.findById).mockResolvedValue(null);
      await expect(assertPurchaserOwnsTicket('t1', 'u1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404, message: 'Booking not found' })
      );
    });

    it('throws 403 if user is not the booking owner', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue({ bookingId: 'b1' } as any);
      vi.mocked(Booking.findById).mockResolvedValue({ userId: new Types.ObjectId() } as any);
      await expect(assertPurchaserOwnsTicket('t1', 'wrong_user')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403, message: 'You do not have access to this ticket' })
      );
    });

    it('succeeds if user is the booking owner', async () => {
      const userId = new Types.ObjectId();
      vi.mocked(Ticket.findOne).mockResolvedValue({ bookingId: 'b1' } as any);
      vi.mocked(Booking.findById).mockResolvedValue({ userId } as any);
      await expect(assertPurchaserOwnsTicket('t1', userId.toString())).resolves.not.toThrow();
    });
  });

  describe('assertAttendeeOwnsTicket', () => {
    it('throws 404 if ticket not found', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue(null);
      await expect(assertAttendeeOwnsTicket('t1', 'u1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404, message: 'Ticket not found' })
      );
    });

    it('throws 403 if user is not the attendee', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue({ attendeeUserId: new Types.ObjectId() } as any);
      await expect(assertAttendeeOwnsTicket('t1', 'wrong_user')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403, message: 'You do not have access to this ticket' })
      );
    });

    it('succeeds if user is the attendee', async () => {
      const userId = new Types.ObjectId();
      vi.mocked(Ticket.findOne).mockResolvedValue({ attendeeUserId: userId } as any);
      await expect(assertAttendeeOwnsTicket('t1', userId.toString())).resolves.not.toThrow();
    });
  });

  describe('canViewTicketQR', () => {
    it('returns false if status is not active', async () => {
      const ticket = { status: 'voided', assignmentStatus: 'unassigned' };
      const allowed = await canViewTicketQR(ticket, 'u1');
      expect(allowed).toBe(false);
    });

    it('returns false if assignmentStatus is pending', async () => {
      const ticket = { status: 'active', assignmentStatus: 'pending' };
      const allowed = await canViewTicketQR(ticket, 'u1');
      expect(allowed).toBe(false);
    });

    it('returns true for claimed status only if attendeeUserId matches', async () => {
      const userId = new Types.ObjectId();
      const ticket = { status: 'active', assignmentStatus: 'claimed', attendeeUserId: userId };

      expect(await canViewTicketQR(ticket, userId.toString())).toBe(true);
      expect(await canViewTicketQR(ticket, 'wrong_user')).toBe(false);
    });

    it('returns true for unassigned status if user is booking owner', async () => {
      const userId = new Types.ObjectId();
      const ticket = { status: 'active', assignmentStatus: 'unassigned', bookingId: 'b1' };

      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ userId }),
      } as any);
      expect(await canViewTicketQR(ticket, userId.toString())).toBe(true);
      expect(await canViewTicketQR(ticket, 'wrong_user')).toBe(false);
    });

    it('returns true for unassigned status if guest session matches within grace window', async () => {
      const ticket = { status: 'active', assignmentStatus: 'unassigned', bookingId: 'b1' };

      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          sessionId: 's1',
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(), // confirmed right now (within grace window)
        }),
      } as any);
      expect(await canViewTicketQR(ticket, undefined, 's1')).toBe(true);
      expect(await canViewTicketQR(ticket, undefined, 'wrong_session')).toBe(false);
    });

    it('returns false for unassigned status if guest session matches but outside grace window', async () => {
      const ticket = { status: 'active', assignmentStatus: 'unassigned', bookingId: 'b1' };

      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          sessionId: 's1',
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(Date.now() - 11 * 60 * 1000), // 11 mins ago (outside grace window)
        }),
      } as any);
      expect(await canViewTicketQR(ticket, undefined, 's1')).toBe(false);
    });
  });

  describe('canDownloadTicketPDF', () => {
    it('returns false if status is not active', async () => {
      const ticket = { status: 'voided' };
      expect(await canDownloadTicketPDF(ticket, 'attendee', 'u1')).toBe(false);
    });

    it('allows attendee if claimed and user matches', async () => {
      const userId = new Types.ObjectId();
      const ticket = { status: 'active', assignmentStatus: 'claimed', attendeeUserId: userId };

      expect(await canDownloadTicketPDF(ticket, 'attendee', userId.toString())).toBe(true);
      expect(await canDownloadTicketPDF(ticket, 'attendee', 'wrong_user')).toBe(false);
    });

    it('denies attendee if ticket is not claimed', async () => {
      const ticket = { status: 'active', assignmentStatus: 'unassigned' };
      expect(await canDownloadTicketPDF(ticket, 'attendee', 'u1')).toBe(false);
    });

    it('allows purchaser if user owns booking', async () => {
      const userId = new Types.ObjectId();
      const ticket = { status: 'active', bookingId: 'b1' };

      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ userId }),
      } as any);
      expect(await canDownloadTicketPDF(ticket, 'purchaser', userId.toString())).toBe(true);
      expect(await canDownloadTicketPDF(ticket, 'purchaser', 'wrong_user')).toBe(false);
    });
  });
});

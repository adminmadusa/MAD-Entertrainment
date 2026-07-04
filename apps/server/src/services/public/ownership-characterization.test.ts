import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

// Hoist mock environment setup
vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_ADMIN_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_SESSION_SECRET = 'testsecret32characterstestsecret32';
  process.env.DLQ_ENCRYPTION_KEY = 'testsecret32characterstestsecret32';
});

import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { AppError } from '../../middleware/error.middleware';
import { getBooking, downloadBookingPDF, generateDownloadToken, resendBookingTickets } from '../../controllers/public/booking.controller';
import { canViewTicketQR } from './ticket-ownership.service';
import { PaymentService } from './payment.service';
import { PublicBookingService } from './booking.service';
import { registerSocketHandlers } from '../../sockets/index';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../services/public/booking.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/public/booking.service')>();
  return {
    PublicBookingService: {
      getBookingByReference: vi.fn(),
      saveCheckoutDetails: vi.fn(),
      assertBookingAccess: actual.PublicBookingService.assertBookingAccess,
    },
  };
});

vi.mock('../../services/public/booking-recovery.service', () => ({
  BookingRecoveryService: {
    getBookingByTransactionId: vi.fn(),
  },
}));

vi.mock('../../services/public/auth.service', () => ({
  AuthService: {
    verifyMagicLinkOrOTP: vi.fn(),
  },
}));

vi.mock('../../utils/response', () => ({
  sendSuccess: vi.fn((res, data, message, statusCode) => {
    res.status(statusCode || 200).json({ success: true, data, message });
  }),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('PR 4a: Booking Ownership Characterization Tests', () => {
  const mockBookingId = new Types.ObjectId();
  const linkedBooking = {
    _id: mockBookingId,
    bookingId: 'MAD-2026-LINKED',
    sessionId: 'session-guest-123',
    userId: new Types.ObjectId(), // Linked to an authenticated user
    guestEmail: 'guest@example.com',
    totalTickets: 1,
    // confirmedAt far in the past — outside grace window — so guest session is denied (BOOKING_VERIFICATION_REQUIRED)
    confirmedAt: new Date(Date.now() - 60 * 60 * 1000), // 60 minutes ago
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 1: Strict Ownership Sites (Should reject guest session access with 403)
  // ───────────────────────────────────────────────────────────────────────────
  describe('STRICT SITES (current behavior rejects guest access after user account linkage)', () => {

    it('CURRENT BEHAVIOR (strict): getBooking blocks guest access after account link — see PR4 decision doc', async () => {
      vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
        booking: linkedBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-LINKED' },
        session: { sessionId: 'session-guest-123' },
        user: undefined, // Anonymous guest request
        header: vi.fn(),
      };
      const res: any = {};
      const next = vi.fn();

      await getBooking(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'BOOKING_VERIFICATION_REQUIRED',
        })
      );
    });

    it('CURRENT BEHAVIOR (strict): downloadBookingPDF blocks guest access after account link — see PR4 decision doc', async () => {
      vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
        booking: linkedBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-LINKED' },
        session: { sessionId: 'session-guest-123' },
        user: undefined,
        header: vi.fn(),
      };
      const res: any = {};
      const next = vi.fn();

      await downloadBookingPDF(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'BOOKING_VERIFICATION_REQUIRED',
        })
      );
    });

    it('CURRENT BEHAVIOR (strict): generateDownloadToken blocks guest access after account link — see PR4 decision doc', async () => {
      vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
        booking: linkedBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-LINKED' },
        session: { sessionId: 'session-guest-123' },
        user: undefined,
        header: vi.fn(),
      };
      const res: any = {};
      const next = vi.fn();

      await generateDownloadToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'BOOKING_VERIFICATION_REQUIRED',
        })
      );
    });

    it('CURRENT BEHAVIOR (strict): resendBookingTickets blocks guest access after account link — see PR4 decision doc', async () => {
      vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
        booking: linkedBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-LINKED' },
        session: { sessionId: 'session-guest-123' },
        user: undefined,
        header: vi.fn(),
      };
      const res: any = {};
      const next = vi.fn();

      await resendBookingTickets(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'BOOKING_VERIFICATION_REQUIRED',
        })
      );
    });

    it('CURRENT BEHAVIOR (strict): canViewTicketQR blocks guest access after account link — see PR4 decision doc', async () => {
      const ticket = { status: 'active', assignmentStatus: 'unassigned', bookingId: mockBookingId };

      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(linkedBooking),
      } as any);

      const allowed = await canViewTicketQR(ticket, undefined, 'session-guest-123');
      expect(allowed).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 2: Lax Ownership Sites (Should permit guest session access)
  // ───────────────────────────────────────────────────────────────────────────
  describe('LAX SITES (current behavior permits guest access even after user account linkage)', () => {

    it('CURRENT BEHAVIOR (lax): PaymentService.assertBookingOwnership allows guest verification post-link — see PR4 decision doc', () => {
      const assertCall = () => {
        (PaymentService as any).assertBookingOwnership(linkedBooking, {
          sessionId: 'session-guest-123',
        });
      };

      expect(assertCall).not.toThrow();
    });

    it('CURRENT BEHAVIOR (lax): PublicBookingService.saveCheckoutDetails allows guest updates post-link — see PR4 decision doc', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue(linkedBooking as any);

      const updateCall = async () => {
        await PublicBookingService.saveCheckoutDetails(
          mockBookingId.toString(),
          {
            firstName: 'Guest',
            lastName: 'User',
            guestEmail: 'guest@example.com',
            guestPhone: '1234567890',
          },
          'session-guest-123',
          undefined
        );
      };

      await expect(updateCall()).resolves.not.toThrow();
    });

    it('CURRENT BEHAVIOR (lax): Socket booking:join allows guest connection post-link', async () => {
      vi.mocked(Booking.findById).mockResolvedValue(linkedBooking as any);

      const socket: any = {
        id: 'socket-123',
        data: {
          sessionId: 'session-guest-123',
        },
        on: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      registerSocketHandlers(socket);

      // Extract the 'booking:join' listener
      const joinCall = socket.on.mock.calls.find((call) => call[0] === 'booking:join');
      expect(joinCall).toBeDefined();

      const listener = joinCall[1];
      await listener({ bookingId: mockBookingId.toString() });

      // Verify that join was successful and did not trigger a 403 emission
      expect(socket.join).toHaveBeenCalledWith(`booking:${mockBookingId.toString()}`);
      expect(socket.emit).toHaveBeenCalledWith('booking:join:status', { success: true, bookingId: mockBookingId.toString() });
    });
  });
});

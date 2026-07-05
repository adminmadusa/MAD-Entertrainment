import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

// Hoist mock environment setup
vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_ADMIN_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_SESSION_SECRET = 'testsecret32characterstestsecret32';
  process.env.DLQ_ENCRYPTION_KEY = 'testsecret32characterstestsecret32';
});

import { getBooking, downloadBookingPDF, generateDownloadToken, resendBookingTickets } from '../../controllers/public/booking.controller';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { registerSocketHandlers } from '../../sockets/index';
import { PublicBookingService } from './booking.service';
import { PaymentService } from './payment.service';
import { canViewTicketQR, canDownloadTicketPDF } from './ticket-ownership.service';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

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

describe('PR 4b: Ownership Consolidation & Hybrid Grace Window Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PublicBookingService.assertBookingAccess', () => {
    it('should allow access to AWAITING_PAYMENT bookings for matching guest session', () => {
      const booking = {
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'session-guest-123',
        userId: undefined,
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'ActiveCheckout');
      };

      expect(assertCall).not.toThrow();
    });

    it('should reject access to AWAITING_PAYMENT bookings if guest session mismatches', () => {
      const booking = {
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'session-guest-123',
        userId: undefined,
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-attacker-456' }, 'ActiveCheckout');
      };

      expect(assertCall).toThrow(AppError);
    });

    it('should allow guest session access to CONFIRMED bookings within the 30-minute grace window', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).not.toThrow();
    });

    it('should reject guest session access to CONFIRMED bookings after the 30-minute grace window expires', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 35 * 60 * 1000), // 35 mins ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).toThrow(expect.objectContaining({ statusCode: 403, code: 'BOOKING_VERIFICATION_REQUIRED' }));
    });

    it('should fallback to createdAt if confirmedAt is undefined and evaluate grace window correctly', () => {
      const recentBooking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      };

      const assertCallRecent = () => {
        PublicBookingService.assertBookingAccess(recentBooking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };
      expect(assertCallRecent).not.toThrow();

      const oldBooking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
      };

      const assertCallOld = () => {
        PublicBookingService.assertBookingAccess(oldBooking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };
      expect(assertCallOld).toThrow(expect.objectContaining({ statusCode: 403, code: 'BOOKING_VERIFICATION_REQUIRED' }));
    });

    it('should allow access to logged-in matching user regardless of grace window expiration', () => {
      const ownerUserId = new Types.ObjectId();
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: ownerUserId,
        confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { userId: ownerUserId.toString() }, 'Fulfillment');
      };

      expect(assertCall).not.toThrow();
    });

    it('should allow guest session access to guest-only bookings (no userId) indefinitely under Fulfillment policy', () => {
      const guestOnlyBooking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: undefined,
        confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(guestOnlyBooking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).not.toThrow();
    });

    it('should allow guest session access to guest-only bookings (no userId) under ActiveCheckout policy if within 30-minute grace window', () => {
      const guestOnlyBooking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: undefined,
        confirmedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(guestOnlyBooking as any, { sessionId: 'session-guest-123' }, 'ActiveCheckout');
      };

      expect(assertCall).not.toThrow();
    });

    it('should deny guest session access to guest-only bookings (no userId) under ActiveCheckout policy after 30-minute grace window expires', () => {
      const guestOnlyBooking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: undefined,
        confirmedAt: new Date(Date.now() - 35 * 60 * 1000), // 35 mins ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(guestOnlyBooking as any, { sessionId: 'session-guest-123' }, 'ActiveCheckout');
      };

      expect(assertCall).toThrow(AppError);
    });
  });

  describe('BUG-297: Payment Verification Redirect Regression', () => {
    it('should allow guest browser to verify payment post-link within the grace window', async () => {
      // 1. Setup a booking awaiting payment owned by a guest session
      const mockBooking = {
        _id: 'booking_297',
        bookingId: 'MAD-2026-BUG297',
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'guest_session_297',
        userId: undefined,
        guestEmail: 'user297@example.com',
      };

      // 2. Simulate payment confirmation (linking to a user account)
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        userId: 'registered_user_297_id',
        confirmedAt: new Date(), // Confirmed right now
      };

      // 3. Invoke verifyPayment as the guest session (anonymous checkout browser context)
      const context = { sessionId: 'guest_session_297', userId: undefined };
      const assertCall = () => {
        PublicBookingService.assertBookingAccess(confirmedBooking as any, context, 'ActiveCheckout');
      };

      // 4. Assert access is allowed (does not throw 403)
      expect(assertCall).not.toThrow();

      // 5. Simulate expiration of the 30-minute grace window
      const expiredConfirmedBooking = {
        ...confirmedBooking,
        confirmedAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
      };

      const expiredAssertCall = () => {
        PublicBookingService.assertBookingAccess(expiredConfirmedBooking as any, context, 'ActiveCheckout');
      };

      // 6. Assert access is rejected post-expiration
      expect(expiredAssertCall).toThrow(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('Fulfillment Endpoint Controllers integration', () => {
    const ownerUserId = new Types.ObjectId();
    const linkedBooking = {
      _id: new Types.ObjectId(),
      bookingId: 'MAD-2026-INTEG',
      sessionId: 'session-guest-789',
      userId: ownerUserId,
      guestEmail: 'guest@example.com',
      confirmedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago (within grace period)
      totalTickets: 1,
    };

    it('should permit getBooking access to guest session within grace window', async () => {
      vi.spyOn(PublicBookingService, 'getBookingByReference').mockResolvedValue({
        booking: linkedBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-INTEG' },
        session: { sessionId: 'session-guest-789' },
        user: undefined,
        header: vi.fn(),
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await getBooking(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject getBooking access to guest session outside grace window', async () => {
      const expiredBooking = {
        ...linkedBooking,
        confirmedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
      };

      vi.spyOn(PublicBookingService, 'getBookingByReference').mockResolvedValue({
        booking: expiredBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      const req: any = {
        params: { bookingId: 'MAD-2026-INTEG' },
        session: { sessionId: 'session-guest-789' },
        user: undefined,
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
  });

  describe('Socket booking:join integration tests', () => {
    it('should permit socket join for guest session within grace window', async () => {
      const bookingId = new Types.ObjectId();
      const mockBooking = {
        _id: bookingId,
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-789',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      };

      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const socket: any = {
        id: 'socket-123',
        data: {
          sessionId: 'session-guest-789',
        },
        on: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      registerSocketHandlers(socket);

      const joinCall = socket.on.mock.calls.find((call: any) => call[0] === 'booking:join');
      expect(joinCall).toBeDefined();

      const listener = joinCall[1];
      await listener({ bookingId: bookingId.toString() });

      expect(socket.join).toHaveBeenCalledWith(`booking:${bookingId.toString()}`);
      expect(socket.emit).toHaveBeenCalledWith('booking:join:status', { success: true, bookingId: bookingId.toString() });
    });

    it('should reject socket join for guest session outside grace window', async () => {
      const bookingId = new Types.ObjectId();
      const mockBooking = {
        _id: bookingId,
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-789',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
      };

      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const socket: any = {
        id: 'socket-123',
        data: {
          sessionId: 'session-guest-789',
        },
        on: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      registerSocketHandlers(socket);

      const joinCall = socket.on.mock.calls.find((call: any) => call[0] === 'booking:join');
      expect(joinCall).toBeDefined();

      const listener = joinCall[1];
      await listener({ bookingId: bookingId.toString() });

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('booking:join:status', {
        success: false,
        bookingId: bookingId.toString(),
        message: 'Forbidden: You do not own this booking',
      });
    });
  });

  describe('Payment Service integration tests', () => {
    it('should permit createPaymentIntent for guest session inside grace window', async () => {
      const bookingId = new Types.ObjectId();
      const mockBooking = {
        _id: bookingId,
        bookingId: 'MAD-2026-PAY1',
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'session-guest-789',
        userId: undefined,
      };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);

      // Verify that calling verifyPayment/assertBookingOwnership does not throw for guest session
      const verifyCall = () => {
        (PaymentService as any).assertBookingOwnership(mockBooking, { sessionId: 'session-guest-789' });
      };

      expect(verifyCall).not.toThrow();
    });

    it('should reject payment verification if guest session mismatches', async () => {
      const bookingId = new Types.ObjectId();
      const mockBooking = {
        _id: bookingId,
        bookingId: 'MAD-2026-PAY2',
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'session-guest-789',
        userId: undefined,
      };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);

      const verifyCall = () => {
        (PaymentService as any).assertBookingOwnership(mockBooking, { sessionId: 'session-guest-mismatch' });
      };

      expect(verifyCall).toThrow(AppError);
    });
  });
});

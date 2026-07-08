import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingStatus } from '@mad/shared';

// Hoist mock environment setup
vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_ADMIN_SECRET = 'testsecret32characterstestsecret32';
  process.env.JWT_SESSION_SECRET = 'testsecret32characterstestsecret32';
  process.env.DLQ_ENCRYPTION_KEY = 'testsecret32characterstestsecret32';
  // Configure grace window to 10 minutes (600000 ms) explicitly in tests
  process.env.BOOKING_OWNERSHIP_GRACE_MS = '600000';
});

import { getBooking } from '../../controllers/public/booking.controller';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { registerSocketHandlers } from '../../sockets/index';
import { PublicBookingService } from './booking.service';
import { PaymentService } from './payment.service';

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
    // ----------------------------------------------------
    // Active / Pending States (Indefinite Guest Access)
    // ----------------------------------------------------
    it('should allow guest session access to AWAITING_PAYMENT bookings indefinitely', () => {
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

    it('should allow guest session access to FAILED bookings indefinitely', () => {
      const booking = {
        status: BookingStatus.FAILED,
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

    // ----------------------------------------------------
    // Confirmed Grace Window Boundaries
    // ----------------------------------------------------
    it('should allow guest session access to CONFIRMED bookings within grace window (9m 59s)', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 599 * 1000), // 9 mins 59s ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).not.toThrow();
    });

    it('should reject guest session access to CONFIRMED bookings outside grace window (10m 01s)', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 601 * 1000), // 10 mins 1s ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).toThrow(expect.objectContaining({ statusCode: 403, code: 'BOOKING_VERIFICATION_REQUIRED' }));
    });

    it('should evaluate boundary refresh: access allowed at 9m59s but rejected at 10m01s', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 599 * 1000), // 9 mins 59s ago
      };

      // 1. First call (at 9m59s) should succeed
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      }).not.toThrow();

      // 2. Adjust timestamp to 10m01s to simulate time elapse/page refresh
      booking.confirmedAt = new Date(Date.now() - 601 * 1000);

      // 3. Second call (at 10m01s) should throw
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      }).toThrow(expect.objectContaining({ statusCode: 403, code: 'BOOKING_VERIFICATION_REQUIRED' }));
    });

    // ----------------------------------------------------
    // Expired / Expiring Grace Window Boundaries
    // ----------------------------------------------------
    it('should allow guest session access to EXPIRED bookings within grace window (9m 59s)', () => {
      const booking = {
        status: BookingStatus.EXPIRED,
        sessionId: 'session-guest-123',
        userId: undefined,
        logicalExpiresAt: new Date(Date.now() - 599 * 1000), // 9m 59s ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'ActiveCheckout');
      };

      expect(assertCall).not.toThrow();
    });

    it('should reject guest session access to EXPIRED bookings outside grace window (10m 01s)', () => {
      const booking = {
        status: BookingStatus.EXPIRED,
        sessionId: 'session-guest-123',
        userId: undefined,
        logicalExpiresAt: new Date(Date.now() - 601 * 1000), // 10m 1s ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'ActiveCheckout');
      };

      expect(assertCall).toThrow(AppError);
    });

    // ----------------------------------------------------
    // Denied States (Cancelled & Refunded)
    // ----------------------------------------------------
    it('should reject guest session access to CANCELLED bookings immediately (no grace)', () => {
      const booking = {
        status: BookingStatus.CANCELLED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).toThrow(AppError);
    });

    it('should reject guest session access to REFUNDED bookings immediately (no grace)', () => {
      const booking = {
        status: BookingStatus.REFUNDED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      expect(assertCall).toThrow(AppError);
    });

    // ----------------------------------------------------
    // Metadata Update Access Extension Prevention
    // ----------------------------------------------------
    it('should not extend guest access when admin/metadata updates occur (leaving confirmedAt unchanged)', () => {
      const booking = {
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-123',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago (expired)
        updatedAt: new Date(), // updated right now
      };

      const assertCall = () => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-123' }, 'Fulfillment');
      };

      // Since confirmedAt is expired, guest access must remain denied regardless of updatedAt
      expect(assertCall).toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    // ----------------------------------------------------
    // Registered Owner Checks
    // ----------------------------------------------------
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
  });

  describe('BUG-297: Payment Verification Redirect Regression', () => {
    it('should allow guest browser to verify payment post-link within the grace window', async () => {
      const mockBooking = {
        _id: 'booking_297',
        bookingId: 'MAD-2026-BUG297',
        status: BookingStatus.AWAITING_PAYMENT,
        sessionId: 'guest_session_297',
        userId: undefined,
        guestEmail: 'user297@example.com',
      };

      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        userId: 'registered_user_297_id',
        confirmedAt: new Date(), // Confirmed right now
      };

      const context = { sessionId: 'guest_session_297', userId: undefined };
      const assertCall = () => {
        PublicBookingService.assertBookingAccess(confirmedBooking as any, context, 'ActiveCheckout');
      };

      expect(assertCall).not.toThrow();

      const expiredConfirmedBooking = {
        ...confirmedBooking,
        confirmedAt: new Date(Date.now() - 11 * 60 * 1000), // 11 minutes ago (grace config is 10 mins)
      };

      const expiredAssertCall = () => {
        PublicBookingService.assertBookingAccess(expiredConfirmedBooking as any, context, 'ActiveCheckout');
      };

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
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago (within grace period)
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
        confirmedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
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

    // ----------------------------------------------------
    // OTP Integration Flow Verification
    // ----------------------------------------------------
    it('should allow access to guest session post-OTP verification when linked as registered owner', async () => {
      const expiredBooking = {
        ...linkedBooking,
        confirmedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (grace expired)
      };

      vi.spyOn(PublicBookingService, 'getBookingByReference').mockResolvedValue({
        booking: expiredBooking as any,
        tickets: [],
        ticketsReady: true,
      });

      // 1. Guest request with expired grace window fails with verification redirect
      const reqGuest: any = {
        params: { bookingId: 'MAD-2026-INTEG' },
        session: { sessionId: 'session-guest-789' },
        user: undefined,
        header: vi.fn(),
      };
      const resGuest: any = {};
      const nextGuest = vi.fn();

      await getBooking(reqGuest, resGuest, nextGuest);
      expect(nextGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'BOOKING_VERIFICATION_REQUIRED',
        })
      );

      // 2. Request with matching verified authenticated owner user ID succeeds
      const reqUser: any = {
        params: { bookingId: 'MAD-2026-INTEG' },
        session: { sessionId: 'session-guest-789' },
        user: { sub: ownerUserId.toString() }, // Verified via OTP magic link/JWT
        header: vi.fn(),
      };
      const resUser: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const nextUser = vi.fn();

      await getBooking(reqUser, resUser, nextUser);
      expect(nextUser).not.toHaveBeenCalled();
      expect(resUser.status).toHaveBeenCalledWith(200);
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
        confirmedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
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
        confirmedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
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

  describe('Lifecycle transition timestamp verification', () => {
    it('should set confirmedAt on transition to CONFIRMED and handle authorization lifecycle', () => {
      const booking = {
        _id: new Types.ObjectId(),
        status: BookingStatus.CONFIRMED,
        sessionId: 'session-guest-789',
        userId: new Types.ObjectId(),
        confirmedAt: new Date(), // Set during transition
      };

      // Guest access succeeds immediately after transition
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-789' }, 'Fulfillment');
      }).not.toThrow();

      // Guest access fails after grace window expires
      booking.confirmedAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-789' }, 'Fulfillment');
      }).toThrow(expect.objectContaining({ statusCode: 403, code: 'BOOKING_VERIFICATION_REQUIRED' }));
    });

    it('should require logicalExpiresAt on transition to EXPIRED/EXPIRING and handle authorization lifecycle', () => {
      const booking = {
        _id: new Types.ObjectId(),
        status: BookingStatus.EXPIRED,
        sessionId: 'session-guest-789',
        userId: undefined,
        logicalExpiresAt: new Date(), // Set during transition
      };

      // Guest access succeeds immediately after transition
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-789' }, 'ActiveCheckout');
      }).not.toThrow();

      // Guest access fails after grace window expires
      booking.logicalExpiresAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      expect(() => {
        PublicBookingService.assertBookingAccess(booking as any, { sessionId: 'session-guest-789' }, 'ActiveCheckout');
      }).toThrow(AppError);
    });
  });
});

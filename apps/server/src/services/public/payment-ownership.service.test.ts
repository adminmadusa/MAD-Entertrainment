import crypto from 'crypto';

import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getStripe } from '../../config/stripe';
import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';
import { PaymentService } from './payment.service';

const { mockSession } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      try {
        await callback();
      } catch (err) {
        throw err;
      }
    }),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
  return { mockSession: session };
});

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockResolvedValue(mockSession),
    },
    startSession: vi.fn().mockResolvedValue(mockSession),
  };
});

const createMockQuery = (val: any) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).lean = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  return query as any;
};

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_KEY_ID: 'test_rzp_key',
    RAZORPAY_KEY_SECRET: 'test_rzp_secret',
    STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
    STRIPE_SECRET_KEY: 'test_stripe_secret',
    ENABLE_ASYNC_CHECKOUT: true,
    MOCK_PAYMENTS: false,
  })),
}));

vi.mock('../../config/razorpay', () => ({
  isRazorpayEnabled: vi.fn(() => true),
  getRazorpay: vi.fn(),
}));

vi.mock('../../config/stripe', () => ({
  isStripeEnabled: vi.fn(() => true),
  getStripe: vi.fn(),
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    updateOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToBooking: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    confirmCapacity: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue({ _id: 'notification_123' } as any),
}));

describe('Payment Service — Guest Booking Ownership Protection & Assignment Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(Booking.findById).mockReset();
    vi.mocked(Booking.findOne).mockReset();
    vi.mocked(Booking.findOneAndUpdate).mockReset();
    vi.mocked(Event.findById).mockReset();
    vi.mocked(Event.findOneAndUpdate).mockReset();
    vi.mocked(Reservation.aggregate).mockReset();
    vi.mocked(SeatLayout.updateOne).mockReset();
    vi.mocked(SeatLayout.findOne).mockReset();
    vi.mocked(Refund.create).mockReset();
    vi.mocked(Refund.findOne).mockReset();
    vi.mocked(ReservationService.transitionForBooking).mockReset();
    vi.mocked(QueueService.enqueue).mockReset();
    vi.mocked(Payment.findOneAndUpdate).mockReset();
    vi.mocked(UserModel.findOne).mockReset();

    vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
    vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(SeatLayout.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([]);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
    vi.mocked(Payment.findOneAndUpdate).mockImplementation(async (query: any, update: any) => {
      const payment = await Payment.findOne(query);
      if (payment) {
        if (update && update.$set) {
          Object.assign(payment, update.$set);
        }
        return payment;
      }
      return {
        _id: query?._id || 'p-123',
        status: PaymentStatus.PAID,
        gatewayPaymentId: update?.$set?.gatewayPaymentId || 'pay_123',
        gatewaySignature: update?.$set?.gatewaySignature,
        paidAt: update?.$set?.paidAt || new Date(),
        save: vi.fn(),
      } as any;
    });

    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'test_rzp_key',
      RAZORPAY_KEY_SECRET: 'test_rzp_secret',
      STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      ENABLE_ASYNC_CHECKOUT: true,
      MOCK_PAYMENTS: false,
    } as any);
  });

  describe('Guest Booking Ownership Protection', () => {
    it('should confirm guest booking successfully while keeping userId as undefined (no silent auto-creation)', async () => {
      const mockBooking = {
        _id: 'guest-booking-123',
        bookingId: 'MAD-2026-GUEST',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [{ tier: 'general', quantity: 2 }],
        guestEmail: 'guest-user@example.com',
        guestName: 'Guest User',
        guestPhone: '9876543210',
        sessionId: 'guest-session-uuid-123',
        userId: undefined,
        bookingVersion: 1,
        save: vi.fn(),
      };

      const mockPayment = {
        _id: 'p-guest-123',
        gatewayOrderId: 'order_guest_123',
        gatewayPaymentId: 'pay_guest_123',
        status: PaymentStatus.COMPLETED,
        amount: 300,
        currency: 'INR',
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        title: 'MAD Event',
        ticketTiers: [{ tier: 'general', soldCount: 10, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_guest_123', 'pay_guest_123', 'payment.captured', 'evt_guest_123');

      expect(result.status).toBe('confirmed');
      expect(mockBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(mockBooking.userId).toBeUndefined();
      expect(Booking.updateOne).not.toHaveBeenCalled();
    });

    it('should link ownership to registered user if one exists during payment confirmation', async () => {
      const mockBooking = {
        _id: 'guest-booking-456',
        bookingId: 'MAD-2026-LINKOWNER',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [{ tier: 'general', quantity: 2 }],
        guestEmail: 'registered-user@example.com',
        guestName: 'Registered User',
        guestPhone: '9876543210',
        sessionId: 'guest-session-uuid-456',
        userId: undefined,
        bookingVersion: 1,
        save: vi.fn(),
      };

      const mockPayment = {
        _id: 'p-guest-456',
        gatewayOrderId: 'order_guest_456',
        gatewayPaymentId: 'pay_guest_456',
        status: PaymentStatus.COMPLETED,
        amount: 300,
        currency: 'INR',
        save: vi.fn(),
      };

      const mockRegisteredUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'registered-user@example.com',
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(mockRegisteredUser) as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        title: 'MAD Event',
        ticketTiers: [{ tier: 'general', soldCount: 10, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_guest_456', 'pay_guest_456', 'payment.captured', 'evt_guest_456');

      expect(result.status).toBe('confirmed');

      expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'guest-booking-456' }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: BookingStatus.CONFIRMED,
            userId: mockRegisteredUser._id,
          }),
          $unset: expect.objectContaining({
            expiresAt: 1,
            logicalExpiresAt: 1,
          }),
        }),
        expect.any(Object)
      );
    });

    it('BUG-297: Guest booking confirms and assigns userId while preserving sessionId', async () => {
      const mockBooking = {
        _id: 'guest-booking-789',
        bookingId: 'MAD-2026-TEST1',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        guestEmail: 'test-user-otp@example.com',
        sessionId: 'session-to-preserve-123',
        userId: undefined,
        bookingVersion: 1,
        save: vi.fn(),
      };

      const mockPayment = {
        _id: 'p-guest-789',
        gatewayOrderId: 'order_test_789',
        gatewayPaymentId: 'pay_test_789',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        currency: 'INR',
        save: vi.fn(),
      };

      const mockRegisteredUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'test-user-otp@example.com',
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(mockRegisteredUser) as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        title: 'MAD Event',
        ticketTiers: [{ tier: 'general', soldCount: 10, totalCapacity: 100, name: 'General' }],
      } as any);

      await PaymentService.confirmFromWebhook('order_test_789', 'pay_test_789', 'payment.captured', 'evt_test_789');

      expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'guest-booking-789' }),
        expect.objectContaining({
          $set: expect.objectContaining({
            userId: mockRegisteredUser._id,
          }),
        }),
        expect.any(Object)
      );

      const callArgs = vi.mocked(Booking.findOneAndUpdate).mock.calls[0];
      const updateObj = callArgs[1] as any;
      expect(updateObj.$unset).toBeDefined();
      expect(updateObj.$unset.sessionId).toBeUndefined();
    });

    it('BUG-297: verifyPayment succeeds using session ownership after webhook confirms and links userId', async () => {
      const mockRegisteredUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const mockBooking = {
        _id: bookingId,
        bookingId: 'MAD-2026-VERIFY297',
        eventId: 'e-123',
        status: BookingStatus.CONFIRMED,
        tickets: [],
        guestEmail: 'test-user-verify-297@example.com',
        sessionId: 'session-preserved-verify-297',
        userId: mockRegisteredUserId,
        totalAmount: 100,
        currency: 'inr',
      };

      const mockPayment = {
        _id: 'p-guest-verify-297',
        gateway: 'stripe',
        status: PaymentStatus.PAID,
        gatewayOrderId: 'pi_verify_297',
        amount: 100,
        currency: 'inr',
        save: vi.fn(),
      };

      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            status: 'succeeded',
            metadata: {
              bookingId: bookingId.toHexString(),
              bookingReference: 'MAD-2026-VERIFY297',
            },
            amount_received: 10000,
            currency: 'inr',
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockPayment)
      } as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-VERIFY297',
        { paymentIntentId: 'pi_verify_297' },
        { sessionId: 'session-preserved-verify-297', userId: undefined }
      );

      expect(result).toBeDefined();
      expect(result._id).toEqual(bookingId);
      expect(result.userId).toBe(mockRegisteredUserId);
      expect(result.sessionId).toBe('session-preserved-verify-297');
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_verify_297');
    });
  });

  describe('confirmBooking Ticket Creation assignmentStatus Verification', () => {
    it('should explicitly pass assignmentStatus: "unassigned" to Ticket.findOneAndUpdate on confirmBooking', async () => {
      const findOneAndUpdateSpy = vi.spyOn(Ticket, 'findOneAndUpdate').mockResolvedValue({} as any);

      const originalEnv = vi.mocked(getEnv)();
      vi.mocked(getEnv).mockReturnValue({
        ...originalEnv,
        ENABLE_ASYNC_CHECKOUT: false,
      } as any);

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        bookingId: 'booking_123',
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const mockBooking = {
        _id: new mongoose.Types.ObjectId(),
        bookingId: 'booking_123',
        eventId: new mongoose.Types.ObjectId(),
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [
          {
            tier: 'general',
            tierName: 'General',
            quantity: 2,
            subtotal: 200,
            pricePerTicket: 100,
          },
        ],
        totalTickets: 2,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const mockEvent = {
        _id: mockBooking.eventId,
        status: 'published',
        bookingMode: 'general',
        ticketTiers: [
          {
            tier: 'general',
            name: 'General',
            soldCount: 10,
            totalCapacity: 100,
          },
        ],
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(mockEvent as any);

      try {
        await PaymentService['confirmBooking'](mockBooking as any, mockPayment as any);

        expect(findOneAndUpdateSpy).toHaveBeenCalled();
        for (const call of findOneAndUpdateSpy.mock.calls) {
          const updateObj = call[1];
          expect(updateObj).toBeDefined();
          expect(updateObj.$setOnInsert).toBeDefined();
          expect(updateObj.$setOnInsert.assignmentStatus).toBe('unassigned');
        }
      } finally {
        findOneAndUpdateSpy.mockRestore();
        vi.mocked(getEnv).mockReturnValue(originalEnv);
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { PaymentService } from './payment.service';
import { BookingStatus, PaymentStatus } from '@mad/shared';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { UserModel } from '../../models/user.schema';
import { Ticket } from '../../models/ticket.schema';
import { getEnv } from '../../config/env';
import { getStripe } from '../../config/stripe';
import { ReservationService } from '../reservation.service';
import { QueueService } from '../queue.service';
import crypto from 'crypto';

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
    findOneAndUpdate: vi.fn().mockImplementation(async (query, update) => {
      const payment = await Payment.findOne(query);
      if (payment) {
        if (update && update.$set) {
          Object.assign(payment, update.$set);
        }
        return payment;
      }
      return null;
    }),
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

describe('Payment Service', () => {
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
    vi.mocked(Payment.findOneAndUpdate).mockImplementation((query: any, update: any) => {
      return Promise.resolve({
        _id: query._id || 'p-123',
        status: PaymentStatus.PAID,
        gatewayPaymentId: update?.$set?.gatewayPaymentId || 'pay_123',
        gatewaySignature: update?.$set?.gatewaySignature,
        paidAt: update?.$set?.paidAt || new Date(),
        save: vi.fn(),
      } as any);
    });

    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'test_rzp_key',
      RAZORPAY_KEY_SECRET: 'test_rzp_secret',
      STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      ENABLE_ASYNC_CHECKOUT: true,
      MOCK_PAYMENTS: false,
    } as any);

    vi.mocked(Event.findById).mockResolvedValue({
      _id: 'e-123',
      title: 'MAD Event',
      status: 'published',
      isDeleted: false,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future event
      soldCount: 0,
      reservedCount: 0,
      totalCapacity: 100,
      bookingMode: 'general_admission',
      ticketTiers: [
        { tier: 'general', name: 'General Admission', price: 100, totalCapacity: 100, soldCount: 0 }
      ]
    } as any);

    vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
  });

  const razorpaySignature = (orderId: string, paymentId: string) =>
    crypto
      .createHmac('sha256', 'test_rzp_secret')
      .update(orderId + '|' + paymentId)
      .digest('hex');

  describe('createPaymentIntent', () => {
    it('should throw error if booking not found', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue(null);
      await expect(PaymentService.createPaymentIntent('fake-id', 'stripe')).rejects.toThrow('Booking not found');
    });

    it('should throw error if booking is not awaiting payment', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({ userId: 'user-123', status: BookingStatus.CONFIRMED } as any);
      await expect(PaymentService.createPaymentIntent('fake-id', 'stripe', { userId: 'user-123' })).rejects.toThrow('cannot accept payment');
    });

    it('should create payment intent when authenticated user owns booking', async () => {
      vi.mocked(getEnv).mockReturnValue({
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
        ENABLE_ASYNC_CHECKOUT: true,
        MOCK_PAYMENTS: true,
      } as any);

      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-123' },
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
        save: vi.fn(),
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.create).mockResolvedValue({ _id: 'p-123' } as any);

      const result = await PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { userId: 'user-123' });

      expect(result.gateway).toBe('razorpay');
      expect(mockBooking.save).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalled();
    });

    it('should reject payment intent when authenticated user does not own booking', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
      } as any);

      await expect(PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { userId: 'user-attacker' })).rejects.toThrow('You do not have access to this booking');
      expect(Payment.create).not.toHaveBeenCalled();
    });

    it('should create payment intent when guest session owns booking', async () => {
      vi.mocked(getEnv).mockReturnValue({
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
        ENABLE_ASYNC_CHECKOUT: true,
        MOCK_PAYMENTS: true,
      } as any);

      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-123',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
        save: vi.fn(),
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.create).mockResolvedValue({ _id: 'p-123' } as any);

      const result = await PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { sessionId: 'session-123' });

      expect(result.gateway).toBe('razorpay');
      expect(mockBooking.save).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalled();
    });

    it('should reject payment intent when guest session does not own booking', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
      } as any);

      await expect(PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { sessionId: 'session-attacker' })).rejects.toThrow('You do not have access to this booking');
      expect(Payment.create).not.toHaveBeenCalled();
    });

    it('should reject payment intent when ownership context is missing', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        sessionId: 'session-owner',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
      } as any);

      await expect(PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay')).rejects.toThrow('You do not have access to this booking');
      expect(Payment.create).not.toHaveBeenCalled();
    });

    it('should enforce ownership before confirming free booking', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 0,
      } as any);

      await expect(PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { sessionId: 'session-attacker' })).rejects.toThrow('You do not have access to this booking');
      expect(Payment.create).not.toHaveBeenCalled();
      expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should successfully confirm booking and return free status if booking totalAmount is 0', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 0,
        currency: 'INR',
        eventId: 'e-123',
        tickets: [],
        save: vi.fn(),
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.create).mockResolvedValue({ _id: 'p-123', status: PaymentStatus.PAID, gateway: 'free', amount: 0 } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      } as any);

      const result = await PaymentService.createPaymentIntent('MAD-2026-ABCDE', 'razorpay', { sessionId: 'session-owner' });

      expect(result).toEqual({
        isFree: true,
        gateway: 'free',
        bookingId: 'b-123',
      });
      expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        bookingId: 'b-123',
        gateway: 'free',
        amount: 0,
        status: PaymentStatus.PAID,
      }));
    });
  });

  describe('verifyPayment', () => {
    it('should allow an authenticated booking owner to verify an already-paid payment idempotently', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.CONFIRMED,
        totalAmount: 100,
        currency: 'inr',
      };
      // Payment must carry gatewayOrderId matching the submitted order_123,
      // and a second Payment.findOne call (replay check) must return null.
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', amount: 100, currency: 'inr', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any) // main lookup
        .mockResolvedValueOnce(null as any);                                           // replay check

      const sig = razorpaySignature('order_123', 'pay_123');
      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: sig },
        { userId: 'user-owner' }
      );

      expect(result).toBe(mockBooking);
      expect(mockPayment.save).not.toHaveBeenCalled();
    });

    it('should allow a guest session owner to verify an already-paid payment idempotently', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.CONFIRMED,
        totalAmount: 100,
        currency: 'inr',
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', amount: 100, currency: 'inr', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any); // replay check

      const sig = razorpaySignature('order_123', 'pay_123');
      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: sig },
        { sessionId: 'session-owner' }
      );

      expect(result).toBe(mockBooking);
      expect(mockPayment.save).not.toHaveBeenCalled();
    });

    it('should reject a different authenticated user before confirming payment', async () => {
      // Under the new flow, payment is looked up first, THEN ownership is checked.
      // For a PENDING payment the 403 still fires — just after the payment lookup.
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
      };
      // Payment is PENDING so the PAID bypass is not triggered and ownership IS enforced.
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      // Generate a valid signature so it passes validateGatewayProof and fails on ownership check
      const sig = razorpaySignature('order_123', 'pay_123');

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: sig },
          { userId: 'user-attacker' }
        )
      ).rejects.toThrow('You do not have access to this booking');
    });

    it('should reject a different guest session before confirming payment', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.AWAITING_PAYMENT,
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' },
          { sessionId: 'session-attacker' }
        )
      ).rejects.toThrow('Razorpay signature verification failed');
    });

    it('should require ownership before confirming an unconfirmed payment', async () => {
      // No ownershipContext at all, PENDING payment — ownership guard fires.
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' }
          // No ownershipContext — defaults to {} which has no userId/sessionId
        )
      ).rejects.toThrow('Razorpay signature verification failed');
    });

    it('should verify a valid payment when the authenticated user owns the booking', async () => {
      vi.mocked(getEnv).mockReturnValue({
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
        ENABLE_ASYNC_CHECKOUT: true,
        MOCK_PAYMENTS: true,
      } as any);

      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_mock_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        {
          razorpay_order_id: 'order_mock_123',
          razorpay_payment_id: 'pay_mock_123',
          razorpay_signature: 'mock_signature',
        },
        { userId: 'user-owner' }
      );

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
    });

    it('should throw error if razorpay signature verification fails', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({ _id: 'b-123', status: BookingStatus.AWAITING_PAYMENT, save: vi.fn() } as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue({ _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() }),
      } as any);

      const payload = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_sig'
      };

      await expect(PaymentService.verifyPayment('b-123', payload, { trustedInternal: true })).rejects.toThrow('Razorpay signature verification failed');
    });

    it('should verify razorpay payment successfully with valid signature', async () => {
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.AWAITING_PAYMENT, tickets: [], save: vi.fn() };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const orderId = 'order_123';
      const paymentId = 'pay_123';

      const payload = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: razorpaySignature(orderId, paymentId)
      };

      const result = await PaymentService.verifyPayment('b-123', payload, { trustedInternal: true });
      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
    });

    it('should reject razorpay payment when submitted order does not match stored gateway order', async () => {
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_victim', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue({ _id: 'b-123', bookingId: 'MAD-2026-ABCDE', status: BookingStatus.AWAITING_PAYMENT } as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      const attackerOrderId = 'order_attacker';
      const payload = {
        razorpay_order_id: attackerOrderId,
        razorpay_payment_id: 'pay_attacker',
        razorpay_signature: razorpaySignature(attackerOrderId, 'pay_attacker'),
      };

      await expect(PaymentService.verifyPayment('MAD-2026-ABCDE', payload, { trustedInternal: true })).rejects.toThrow('Razorpay order does not belong to this booking');
      expect(mockPayment.save).not.toHaveBeenCalled();
      expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject razorpay payment ID already attached to a different payment record', async () => {
      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', eventId: 'e-123', status: BookingStatus.AWAITING_PAYMENT, tickets: [] };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };
      const duplicatePayment = { _id: 'p-999', gateway: 'razorpay', gatewayPaymentId: 'pay_123' };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(duplicatePayment as any);

      const payload = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      };

      await expect(PaymentService.verifyPayment('MAD-2026-ABCDE', payload, { trustedInternal: true })).rejects.toThrow('Razorpay payment has already been used');
      expect(mockPayment.save).not.toHaveBeenCalled();
      expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should verify mock razorpay payment when mock order matches stored gateway order', async () => {
      vi.mocked(getEnv).mockReturnValue({
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
        ENABLE_ASYNC_CHECKOUT: true,
        MOCK_PAYMENTS: true,
      } as any);

      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', eventId: 'e-123', status: BookingStatus.AWAITING_PAYMENT, tickets: [] };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_mock_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_mock_123',
        razorpay_payment_id: 'pay_mock_123',
        razorpay_signature: 'mock_signature',
      }, { trustedInternal: true });

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(mockPayment.gatewayPaymentId).toBe('pay_mock_123');
    });

    it('should return booking successfully when payment is already paid', async () => {
      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', status: BookingStatus.CONFIRMED, totalAmount: 100, currency: 'inr' };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', gatewayPaymentId: 'pay_123', amount: 100, currency: 'inr', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any) // main lookup
        .mockResolvedValueOnce(null as any);                                           // replay check

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

      expect(result).toBe(mockBooking);
      expect(mockPayment.save).not.toHaveBeenCalled();
    });

    it('should allow retry verification for the same payment record', async () => {
      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', eventId: 'e-123', status: BookingStatus.AWAITING_PAYMENT, tickets: [] };
      const mockPayment = {
        _id: 'p-123',
        gateway: 'razorpay',
        status: PaymentStatus.PENDING,
        gatewayOrderId: 'order_123',
        gatewayPaymentId: 'pay_123',
        save: vi.fn(),
      };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(Payment.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should redeem a coupon with an atomic conditional update during normal confirmation', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-123',
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

      expect(result).toBeDefined();
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        {
          _id: 'coupon-123',
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        },
        { $inc: { usedCount: 1 } },
        expect.objectContaining({ session: mockSession })
      );
      expect(Coupon.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow redemption of the last available coupon use', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-last',
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Coupon.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

      expect(result).toBeDefined();
      expect(Coupon.updateOne).toHaveBeenCalledTimes(1);
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'coupon-last',
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        }),
        { $inc: { usedCount: 1 } },
        expect.objectContaining({ session: mockSession })
      );
    });

    it('should reject confirmation when the coupon usage limit is exhausted', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-exhausted',
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Coupon.updateOne).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as any);

      await expect(PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true })).rejects.toThrow('Coupon usage limit reached');

      expect(Coupon.updateOne).toHaveBeenCalledTimes(1);
      expect(Coupon.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow only one concurrent redemption when two bookings race for one remaining coupon use', async () => {
      const bookingA = {
        _id: 'b-1',
        bookingId: 'MAD-2026-AAA11',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-race',
      };
      const bookingB = {
        _id: 'b-2',
        bookingId: 'MAD-2026-BBB22',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-race',
      };
      const paymentA = { _id: 'p-1', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_1', save: vi.fn() };
      const paymentB = { _id: 'p-2', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_2', save: vi.fn() };

      vi.mocked(Booking.findOne).mockImplementation((query: any) => {
        if (query.bookingId === bookingA.bookingId) return Promise.resolve(bookingA as any);
        if (query.bookingId === bookingB.bookingId) return Promise.resolve(bookingB as any);
        return Promise.resolve(null);
      });
      vi.mocked(Payment.findOne).mockImplementation((query: any) => {
        if (query.bookingId === bookingA._id) return { sort: vi.fn().mockResolvedValue(paymentA) } as any;
        if (query.bookingId === bookingB._id) return { sort: vi.fn().mockResolvedValue(paymentB) } as any;
        return Promise.resolve(null) as any;
      });
      vi.mocked(Booking.findOneAndUpdate).mockImplementation((query: any) => {
        if (query._id === bookingA._id) return Promise.resolve(bookingA as any);
        if (query._id === bookingB._id) return Promise.resolve(bookingB as any);
        return Promise.resolve(null);
      });
      vi.mocked(Coupon.updateOne)
        .mockResolvedValueOnce({ modifiedCount: 1 } as any)
        .mockResolvedValueOnce({ modifiedCount: 0 } as any);

      const [first, second] = await Promise.allSettled([
        PaymentService.verifyPayment(bookingA.bookingId, {
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: razorpaySignature('order_1', 'pay_1'),
        }, { trustedInternal: true }),
        PaymentService.verifyPayment(bookingB.bookingId, {
          razorpay_order_id: 'order_2',
          razorpay_payment_id: 'pay_2',
          razorpay_signature: razorpaySignature('order_2', 'pay_2'),
        }, { trustedInternal: true }),
      ]);

      const outcomes = [first, second];
      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
      expect(Coupon.updateOne).toHaveBeenCalledTimes(2);
      expect(Coupon.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should not redeem a coupon when duplicate confirmation is skipped by booking status guard', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        couponId: 'coupon-123',
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };
      const currentBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Booking.findById)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue({ status: BookingStatus.CONFIRMED, bookingId: mockBooking.bookingId }),
          }),
        } as any)
        .mockResolvedValueOnce(currentBooking as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

      expect(result).toBe(currentBooking);
      expect(Coupon.updateOne).not.toHaveBeenCalled();
      expect(Coupon.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('confirmFromWebhook and recovery', () => {
    it('should skip confirmation if payment is already paid (idempotency check)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PAID, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('skipped');
      expect(result.bookingId).toBe('b-123');
    });

    it('should confirm booking successfully if booking status is EXPIRED (late webhook recovery)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.EXPIRED, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('confirmed');
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(vi.mocked(Booking.findOneAndUpdate)).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.objectContaining({ $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] }) }),
        expect.any(Object),
        expect.objectContaining({ new: false })
      );
    });

    it('should confirm booking successfully if booking status is EXPIRING (concurrent webhook recovery)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.EXPIRING, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('confirmed');
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(vi.mocked(Booking.findOneAndUpdate)).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.objectContaining({ $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] }) }),
        expect.any(Object),
        expect.objectContaining({ new: false })
      );
    });

    it('should reject late recovery if event capacity is exhausted', async () => {
      const refundSpy = vi.spyOn(PaymentService as any, 'triggerRefundRequest').mockResolvedValue(undefined);
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        soldCount: 99,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 99, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(vi.mocked(Booking.findOneAndUpdate)).not.toHaveBeenCalled();
      expect(refundSpy).toHaveBeenCalledWith(
        mockBooking,
        mockPayment,
        'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED',
        expect.any(Object),
        'auto_recovery',
        'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
      );
      refundSpy.mockRestore();
    });

    it('should reject late recovery if seats are already booked', async () => {
      const refundSpy = vi.spyOn(PaymentService as any, 'triggerRefundRequest').mockResolvedValue(undefined);
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'vip', quantity: 1, subtotal: 500, pricePerTicket: 500, tierName: 'VIP', seats: [{ seatId: 'seat-101', row: 'A', number: 1 }] }],
        totalTickets: 1,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        soldCount: 0,
        reservedCount: 0,
        totalCapacity: 100,
        bookingMode: 'seat_based',
        ticketTiers: [{ tier: 'vip', soldCount: 0, totalCapacity: 10, name: 'VIP' }],
      } as any);

      vi.mocked(SeatLayout.findOne).mockImplementation(() => createMockQuery({
        eventId: 'e-123',
        seats: [{ seatId: 'seat-101', status: 'booked' }]
      }) as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(vi.mocked(Booking.findOneAndUpdate)).not.toHaveBeenCalled();
      expect(refundSpy).toHaveBeenCalledWith(
        mockBooking,
        mockPayment,
        'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN',
        expect.any(Object),
        'auto_recovery',
        'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
      );
      refundSpy.mockRestore();
    });
  });

  describe('Phase 1 Webhook & Intent Isolation', () => {
    it('should fail loudly in verifyPayment if no payment identifier is supplied', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
      } as any);

      await expect(
        PaymentService.verifyPayment('MAD-2026-ABCDE', {}, { userId: 'user-owner' })
      ).rejects.toThrow('Payment verification requires a payment identifier');
    });

    it('should query exact payment record using paymentIntentId for Stripe', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        totalAmount: 100,
        currency: 'INR',
      };
      const mockPayment = { _id: 'p-stripe-123', gateway: 'stripe', status: PaymentStatus.PENDING, gatewayOrderId: 'pi_123', save: vi.fn() };

      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'pi_123',
            status: 'succeeded',
            amount_received: 10000,
            currency: 'inr',
            metadata: {
              bookingId: 'b-123',
              bookingReference: 'MAD-2026-ABCDE',
            },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockImplementation((query: any) => {
        if (query.gatewayOrderId === 'pi_123' && query.gateway === 'stripe') {
          return { sort: vi.fn().mockResolvedValue(mockPayment) } as any;
        }
        return { sort: vi.fn().mockResolvedValue(null) } as any;
      });
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { paymentIntentId: 'pi_123' },
        { userId: 'user-owner' }
      );

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(Payment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'b-123',
          gatewayOrderId: 'pi_123',
          gateway: 'stripe',
        })
      );
    });

    it('should not mutate booking or release inventory in failPaymentAndReleaseInventory if status is not AWAITING_PAYMENT', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.CONFIRMED, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.failed', 'evt_123');
      expect(result.status).toBe('failed');
      expect(mockPayment.status).toBe(PaymentStatus.FAILED);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockBooking.save).not.toHaveBeenCalled();
    });

    it('should bind successful payment to booking.paymentId when confirmation succeeds (Multiple Payment Regression Test)', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        paymentId: 'p-A',
        totalAmount: 100,
        currency: 'INR',
      };

      const paymentB = {
        _id: 'p-B',
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        gatewayOrderId: 'pi_B',
        save: vi.fn(),
      };

      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'pi_B',
            status: 'succeeded',
            amount_received: 10000,
            currency: 'inr',
            metadata: {
              bookingId: 'b-123',
              bookingReference: 'MAD-2026-ABCDE',
            },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(paymentB),
      } as any);
      vi.mocked(Booking.findOneAndUpdate).mockImplementation((query: any, update: any) => {
        if (update.$set) {
          mockBooking.status = update.$set.status;
          mockBooking.paymentId = update.$set.paymentId;
        }
        return mockBooking as any;
      });

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { paymentIntentId: 'pi_B' },
        { userId: 'user-owner' }
      );

      expect(result).toBeDefined();
      expect(paymentB.status).toBe(PaymentStatus.PAID);
      expect(mockBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(mockBooking.paymentId).toBe('p-B');
    });

    it('should skip capacity rollback if booking status is already CONFIRMED (concurrency verify race)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'stripe', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        soldCount: 0,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 0, totalCapacity: 100, name: 'General' }],
      } as any);

      // Simulate Thread 2 losing the confirmation race because Booking is already CONFIRMED (Same-Payment Case A)
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null);
      const docQueryMock = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        catch: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          if (docQueryMock.select.mock.calls.length > 0) {
            resolve({ status: BookingStatus.CONFIRMED, bookingId: 'b-123', paymentId: 'p-123' });
          } else {
            resolve(mockBooking);
          }
        })
      };
      vi.mocked(Booking.findById).mockImplementation((id: any) => {
        if (id === 'b-123') return docQueryMock as any;
        return null as any;
      });

      // Event update is mocked to succeed
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('confirmed');
      expect(mockPayment.failureReason).toBeUndefined();
      // Capacity rollback (Event.updateOne) must NOT have been called since winner is CONFIRMED
      expect(Event.updateOne).not.toHaveBeenCalled();
    });

    it('should automatically create a requested Refund record when late payment recovery is rejected', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        totalAmount: 200,
        currency: 'INR',
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any); // No existing refund request

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        soldCount: 99,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 99, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED');
      // Assert Refund record was created
      expect(Refund.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            bookingId: 'b-123',
            paymentId: 'p-123',
            amount: 200,
            currency: 'INR',
            reason: 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED',
            status: 'requested',
          }),
        ],
        expect.any(Object)
      );
    });
  });

  describe('Guest Booking Ownership Protection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

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
        userId: undefined, // Pure Guest Booking
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
        title: 'MAD Event',
        ticketTiers: [{ tier: 'general', soldCount: 10, totalCapacity: 100, name: 'General' }],
      } as any);

      // Confirm guest booking
      const result = await PaymentService.confirmFromWebhook('order_guest_123', 'pay_guest_123', 'payment.captured', 'evt_guest_123');

      expect(result.status).toBe('confirmed');
      expect(mockBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(mockBooking.userId).toBeUndefined(); // Assert userId remains undefined (guest-owned, sessionId-based)
      expect(Booking.updateOne).not.toHaveBeenCalled(); // No silent updates or user assignments
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

      // Mock UserModel.findOne to return the registered user
      vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(mockRegisteredUser) as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        title: 'MAD Event',
        ticketTiers: [{ tier: 'general', soldCount: 10, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_guest_456', 'pay_guest_456', 'payment.captured', 'evt_guest_456');

      expect(result.status).toBe('confirmed');

      // Assert findOneAndUpdate was called with userId in $set and expiresAt/logicalExpiresAt in $unset
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

      // Verify sessionId is NOT in the $unset block
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
            amount_received: 10000, // 100 * 100 paise
            currency: 'inr',
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockPayment)
      } as any);

      // Call verifyPayment using ONLY session ownership (userId is undefined in context)
      const result = await PaymentService.verifyPayment(
        'MAD-2026-VERIFY297',
        { paymentIntentId: 'pi_verify_297' },
        { sessionId: 'session-preserved-verify-297', userId: undefined }
      );

      expect(result).toBeDefined();
      expect(result._id).toEqual(bookingId);
      expect(result.userId).toBe(mockRegisteredUserId);
      expect(result.sessionId).toBe('session-preserved-verify-297');
      // Stripe API was called — proof was verified by validateGatewayProof.
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_verify_297');
    });
  });

  describe('Transactional Payment Status Transition', () => {
    it('should update payment status to PAID atomically inside the transaction session', async () => {
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        totalTickets: 0,
        bookingVersion: 1,
        save: vi.fn(),
      };

      const mockPayment = {
        _id: 'p-123',
        gatewayOrderId: 'order_123',
        gatewayPaymentId: 'pay_123',
        status: PaymentStatus.PENDING,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOneAndUpdate).mockResolvedValue(mockPayment as any);

      await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p-123', status: PaymentStatus.PENDING },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: PaymentStatus.PAID,
            gatewayPaymentId: 'pay_123',
          })
        }),
        expect.objectContaining({ session: mockSession })
      );
    });
  });

  describe('Event Expiry Validation during Payment Operations', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(getEnv).mockReturnValue({
        MOCK_PAYMENTS: false,
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
        ENABLE_ASYNC_CHECKOUT: false,
      } as any);
    });

    it('createPaymentIntent should block payment intent if event has started', async () => {
      const mockBooking = {
        _id: 'booking_123',
        eventId: 'event_123',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
        currency: 'INR',
        tickets: [],
        totalTickets: 1,
      };

      const mockEvent = {
        _id: 'event_123',
        status: 'published',
        isDeleted: false,
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
      };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await expect(
        PaymentService.createPaymentIntent('booking_123', 'stripe', { trustedInternal: true })
      ).rejects.toThrow('This event is no longer available for booking.');
    });

    it('verifyPayment should block payment verification and trigger refund if event has started', async () => {
      const mockBooking = {
        _id: 'booking_123',
        bookingId: 'booking_123',
        eventId: 'event_123',
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
        currency: 'INR',
        tickets: [],
        totalTickets: 1,
        save: vi.fn(),
      };

      const mockPayment = {
        _id: 'payment_123',
        bookingId: 'booking_123',
        gatewayOrderId: 'pi_123',
        status: PaymentStatus.PENDING,
        amount: 100,
        currency: 'INR',
        save: vi.fn(),
      };

      const mockEvent = {
        _id: 'event_123',
        status: 'published',
        isDeleted: false,
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
      };

      // Mock Stripe client to return a valid retrieve intent matching this booking
      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'pi_123',
            status: 'succeeded',
            amount_received: 10000,
            currency: 'inr',
            metadata: {
              bookingId: 'booking_123',
              bookingReference: 'booking_123',
            },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
      vi.spyOn(PaymentService as any, 'failPaymentAndReleaseInventory').mockResolvedValue(undefined);

      await expect(
        PaymentService.verifyPayment('booking_123', { paymentIntentId: 'pi_123' }, { trustedInternal: true })
      ).rejects.toThrow('This event is no longer available for booking.');

      expect(PaymentService['failPaymentAndReleaseInventory']).toHaveBeenCalledWith(
        mockBooking,
        mockPayment,
        'Event has already started or ended.',
        'auto_recovery',
        'PAYMENT_VALIDATION_FAILURE'
      );
    });
  });

  describe('confirmBooking Ticket Creation assignmentStatus Verification', () => {
    it('should explicitly pass assignmentStatus: "unassigned" to Ticket.findOneAndUpdate on confirmBooking', async () => {
      // 1. Mock Ticket.findOneAndUpdate
      const findOneAndUpdateSpy = vi.spyOn(Ticket, 'findOneAndUpdate').mockResolvedValue({} as any);

      // 2. Mock getEnv to return ENABLE_ASYNC_CHECKOUT: false
      const originalEnv = vi.mocked(getEnv)();
      vi.mocked(getEnv).mockReturnValue({
        ...originalEnv,
        ENABLE_ASYNC_CHECKOUT: false,
      } as any);

      // 3. Mock required dependencies for confirmBooking
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

      // Mock DB calls
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(mockEvent as any);

      try {
        // 4. Call confirmBooking
        await PaymentService['confirmBooking'](mockBooking as any, mockPayment as any);

        // 5. Assert Ticket.findOneAndUpdate was called with assignmentStatus: 'unassigned'
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

  // ─────────────────────────────────────────────────────────────────────────────
  // BUG-297 — validateGatewayProof() via verifyPayment() PAID path
  //
  // These tests verify that a payment whose status is already PAID (set by the
  // webhook arriving first) is accepted or rejected correctly without ever
  // calling assertBookingOwnership().
  //
  // Positive tests: legitimate caller with rotated session gets 200-equivalent.
  // Negative tests: attacker presenting invalid proof is rejected with 400.
  // ─────────────────────────────────────────────────────────────────────────────
  describe('BUG-297 — verifyPayment PAID path (validateGatewayProof)', () => {
    const bookingObjectId = new mongoose.Types.ObjectId();
    const bookingIdStr = bookingObjectId.toHexString();

    // A booking that has already been confirmed by the webhook.
    // booking.userId is a registered user — the guest session is now stale.
    const confirmedBooking = {
      _id: bookingObjectId,
      bookingId: 'MAD-BOOKING-001',
      eventId: 'e-123',
      totalAmount: 100,
      currency: 'inr',
      status: 'confirmed',
      userId: new mongoose.Types.ObjectId(), // linked by webhook
      sessionId: 'old-session-id',           // stale guest session
      save: vi.fn().mockResolvedValue(undefined),
    };

    // ── Helpers ────────────────────────────────────────────────────────────────

    const makeStripePayment = (overrides: Record<string, unknown> = {}) => ({
      _id: new mongoose.Types.ObjectId(),
      bookingId: bookingObjectId,
      gateway: 'stripe',
      status: PaymentStatus.PAID,
      gatewayOrderId: 'pi_test_001',
      amount: 100,
      currency: 'inr',
      save: vi.fn(),
      ...overrides,
    });

    const makeRazorpayPayment = (overrides: Record<string, unknown> = {}) => ({
      _id: new mongoose.Types.ObjectId(),
      bookingId: bookingObjectId,
      gateway: 'razorpay',
      status: PaymentStatus.PAID,
      gatewayOrderId: 'order_rzp_001',
      amount: 100,
      currency: 'inr',
      save: vi.fn(),
      ...overrides,
    });

    const validStripeIntent = {
      status: 'succeeded',
      metadata: { bookingId: bookingIdStr, bookingReference: 'MAD-BOOKING-001' },
      amount_received: 10000,
      currency: 'inr',
    };

    beforeEach(() => {
      vi.mocked(Booking.findOne).mockImplementation(() =>
        createMockQuery(confirmedBooking) as any
      );
    });

    // ── POSITIVE: Webhook-first race resolution ────────────────────────────────

    it('[BUG-297][POSITIVE] Stripe — webhook wins, rotated session, full proof passes → 200', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );
      const mockStripe = {
        paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      // ownershipContext uses a DIFFERENT session — simulates rotated session post-redirect.
      const result = await PaymentService.verifyPayment(
        bookingIdStr,
        { paymentIntentId: 'pi_test_001' },
        { sessionId: 'new-rotated-session' }   // does NOT match confirmedBooking.sessionId
      );

      // Must return the booking (no 403 thrown).
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(bookingIdStr);
      // Stripe API was called — proof was verified, not skipped.
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001');
    });

    it('[BUG-297][POSITIVE] Razorpay — webhook wins, rotated session, full proof passes → 200', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeRazorpayPayment()) as any
      );
      // No duplicate payment record.
      vi.mocked(Payment.findOne)
        .mockImplementationOnce(() => createMockQuery(makeRazorpayPayment()) as any) // main lookup
        .mockImplementationOnce(() => createMockQuery(null) as any);                 // replay check

      const sig = razorpaySignature('order_rzp_001', 'pay_rzp_001');

      const result = await PaymentService.verifyPayment(
        bookingIdStr,
        {
          razorpay_order_id: 'order_rzp_001',
          razorpay_payment_id: 'pay_rzp_001',
          razorpay_signature: sig,
        },
        { sessionId: 'new-rotated-session' }
      );

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(bookingIdStr);
    });

    // ── NEGATIVE: Stripe security rejections on PAID path ─────────────────────

    it('[BUG-297][NEGATIVE] Stripe — PAID booking, bookingId metadata mismatch → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );
      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            ...validStripeIntent,
            metadata: { bookingId: 'OTHER_BOOKING_ID', bookingReference: 'MAD-OTHER' },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      await expect(
        PaymentService.verifyPayment(bookingIdStr, { paymentIntentId: 'pi_test_001' }, {})
      ).rejects.toThrow('Stripe payment intent does not belong to this booking');
    });

    it('[BUG-297][NEGATIVE] Stripe — PAID booking, intent status not succeeded → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );
      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            ...validStripeIntent,
            status: 'requires_payment_method',
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      await expect(
        PaymentService.verifyPayment(bookingIdStr, { paymentIntentId: 'pi_test_001' }, {})
      ).rejects.toThrow('Stripe payment verification failed');
    });

    it('[BUG-297][NEGATIVE] Stripe — PAID booking, amount mismatch → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );
      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            ...validStripeIntent,
            amount_received: 5000, // Wrong — expects 10000 paise
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      await expect(
        PaymentService.verifyPayment(bookingIdStr, { paymentIntentId: 'pi_test_001' }, {})
      ).rejects.toThrow('Payment amount does not match booking total');
    });

    it('[BUG-297][NEGATIVE] Stripe — PAID booking, currency mismatch → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );
      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            ...validStripeIntent,
            currency: 'usd', // Wrong — booking is INR
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      await expect(
        PaymentService.verifyPayment(bookingIdStr, { paymentIntentId: 'pi_test_001' }, {})
      ).rejects.toThrow('Payment currency does not match booking currency');
    });

    // ── NEGATIVE: Razorpay security rejections on PAID path ───────────────────

    it('[BUG-297][NEGATIVE] Razorpay — PAID booking, order ID mismatch → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeRazorpayPayment()) as any // gatewayOrderId = order_rzp_001
      );
      const sig = razorpaySignature('order_other', 'pay_rzp_001');

      await expect(
        PaymentService.verifyPayment(
          bookingIdStr,
          {
            razorpay_order_id: 'order_other',   // does NOT match payment.gatewayOrderId
            razorpay_payment_id: 'pay_rzp_001',
            razorpay_signature: sig,
          },
          {}
        )
      ).rejects.toThrow('Razorpay order does not belong to this booking');
    });

    it('[BUG-297][NEGATIVE] Razorpay — PAID booking, invalid signature → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeRazorpayPayment()) as any
      );

      await expect(
        PaymentService.verifyPayment(
          bookingIdStr,
          {
            razorpay_order_id: 'order_rzp_001',
            razorpay_payment_id: 'pay_rzp_001',
            razorpay_signature: 'invalid_signature',
          },
          {}
        )
      ).rejects.toThrow('Razorpay signature verification failed');
    });

    it('[BUG-297][NEGATIVE] Razorpay — PAID booking, payment ID replay → 400', async () => {
      const payment = makeRazorpayPayment();
      vi.mocked(Payment.findOne)
        .mockImplementationOnce(() => createMockQuery(payment) as any)   // main lookup
        .mockImplementationOnce(() =>                                     // replay check — duplicate found
          createMockQuery({ _id: new mongoose.Types.ObjectId() }) as any
        );

      const sig = razorpaySignature('order_rzp_001', 'pay_rzp_001');

      await expect(
        PaymentService.verifyPayment(
          bookingIdStr,
          {
            razorpay_order_id: 'order_rzp_001',
            razorpay_payment_id: 'pay_rzp_001',
            razorpay_signature: sig,
          },
          {}
        )
      ).rejects.toThrow('Razorpay payment has already been used');
    });

    it('[BUG-297][NEGATIVE] Razorpay — PAID booking, missing credentials → 400', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeRazorpayPayment()) as any
      );

      await expect(
        PaymentService.verifyPayment(
          bookingIdStr,
          {
            razorpay_order_id: 'order_rzp_001',
            // razorpay_payment_id and razorpay_signature intentionally absent
          },
          {}
        )
      ).rejects.toThrow('Missing Razorpay credentials in payment payload');
    });

    // ── REGRESSION: existing zero-proof shortcut is gone ──────────────────────

    it('[BUG-297][REGRESSION] Stripe PAID path — no paymentIntentId in payload → 400 (zero-proof shortcut removed)', async () => {
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );

      // Previously this would return booking with zero validation.
      // Now it must fail because no gateway identifier is present — caught by
      // assertProductionPaymentIntegrity before even reaching validateGatewayProof.
      await expect(
        PaymentService.verifyPayment(bookingIdStr, {}, {})
      ).rejects.toThrow();
    });

    // ── BUG-297 Additional Ownership Recovery Guards and Tests ────────────────

    it('[BUG-297] does not overwrite existing authenticated owner when gateway proof is valid but ownership context belongs to a different authenticated user', async () => {
      // existing authenticated owner: UserA
      const userAId = new mongoose.Types.ObjectId();
      const mockBooking = {
        _id: bookingObjectId,
        bookingId: 'MAD-BOOKING-001',
        eventId: 'e-123',
        totalAmount: 100,
        currency: 'inr',
        status: 'confirmed',
        userId: userAId, // UserA
        sessionId: 'session-old',
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Booking.findOne).mockImplementation(() =>
        createMockQuery(mockBooking) as any
      );

      // PAID Stripe payment
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );

      const mockStripe = {
        paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      // Attempt to verify as UserB
      const userBId = new mongoose.Types.ObjectId().toHexString();

      await expect(
        PaymentService.verifyPayment(
          bookingIdStr,
          { paymentIntentId: 'pi_test_001' },
          { userId: userBId } // different authenticated user
        )
      ).rejects.toThrow('You do not have access to this booking');

      // Verify booking.userId remains unchanged (UserA)
      expect(mockBooking.userId).toEqual(userAId);
    });

    it('[BUG-297] rotated guest session recovers ownership (PENDING payment)', async () => {
      // Guest booking: userId is null, sessionId is old
      const mockBooking = {
        _id: bookingObjectId,
        bookingId: 'MAD-BOOKING-001',
        eventId: 'e-123',
        totalAmount: 100,
        currency: 'inr',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        userId: undefined,
        sessionId: 'session-old',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Booking.findOne).mockImplementation(() =>
        createMockQuery(mockBooking) as any
      );

      // PENDING payment
      const pendingPayment = makeStripePayment({ status: PaymentStatus.PENDING });
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(pendingPayment) as any
      );

      const mockStripe = {
        paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      } as any);

      // verifyPayment called with a new rotated session
      const result = await PaymentService.verifyPayment(
        bookingIdStr,
        { paymentIntentId: 'pi_test_001' },
        { sessionId: 'session-new-rotated' }
      );

      expect(result).toBeDefined();
      // Verify sessionId was updated to the new session ID
      expect(mockBooking.sessionId).toBe('session-new-rotated');
      expect(mockBooking.userId).toBeUndefined();
      expect(mockBooking.save).toHaveBeenCalled();
    });

    it('[BUG-297] rotated guest session recovers ownership (PAID payment)', async () => {
      // Guest booking: userId is null, sessionId is old
      const mockBooking = {
        _id: bookingObjectId,
        bookingId: 'MAD-BOOKING-001',
        eventId: 'e-123',
        totalAmount: 100,
        currency: 'inr',
        status: BookingStatus.CONFIRMED,
        tickets: [],
        userId: undefined,
        sessionId: 'session-old',
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Booking.findOne).mockImplementation(() =>
        createMockQuery(mockBooking) as any
      );

      // PAID payment (already confirmed by webhook)
      vi.mocked(Payment.findOne).mockImplementation(() =>
        createMockQuery(makeStripePayment()) as any
      );

      const mockStripe = {
        paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      // verifyPayment called with a new rotated session
      const result = await PaymentService.verifyPayment(
        bookingIdStr,
        { paymentIntentId: 'pi_test_001' },
        { sessionId: 'session-new-rotated' }
      );

      expect(result).toBeDefined();
      // Verify sessionId was updated to the new session ID
      expect(mockBooking.sessionId).toBe('session-new-rotated');
      expect(mockBooking.userId).toBeUndefined();
      expect(mockBooking.save).toHaveBeenCalled();
    });
  });
});

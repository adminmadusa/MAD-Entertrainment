import crypto from 'crypto';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
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
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', amount: 100, currency: 'inr', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne)
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);

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
        .mockResolvedValueOnce(null as any);

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
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PENDING, gatewayOrderId: 'order_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

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
        .mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any)
        .mockResolvedValueOnce(null as any);

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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './payment.service';
import { BookingStatus, PaymentStatus } from '@mad/shared';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Coupon } from '../../models/coupon.schema';
import { getEnv } from '../../config/env';
import crypto from 'crypto';

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
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToBooking: vi.fn(),
  emitToEvent: vi.fn(),
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

describe('Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'test_rzp_key',
      RAZORPAY_KEY_SECRET: 'test_rzp_secret',
      STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      ENABLE_ASYNC_CHECKOUT: true,
      MOCK_PAYMENTS: false,
    } as any);
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
  });

  describe('verifyPayment', () => {
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

      await expect(PaymentService.verifyPayment('b-123', payload)).rejects.toThrow('Razorpay signature verification failed');
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

      const result = await PaymentService.verifyPayment('b-123', payload);
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

      await expect(PaymentService.verifyPayment('MAD-2026-ABCDE', payload)).rejects.toThrow('Razorpay order does not belong to this booking');
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

      await expect(PaymentService.verifyPayment('MAD-2026-ABCDE', payload)).rejects.toThrow('Razorpay payment has already been used');
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
      });

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(mockPayment.gatewayPaymentId).toBe('pay_mock_123');
    });

    it('should return booking successfully when payment is already paid', async () => {
      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', status: BookingStatus.CONFIRMED };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', gatewayPaymentId: 'pay_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      });

      expect(result).toBe(mockBooking);
      expect(mockPayment.save).not.toHaveBeenCalled();
      expect(Payment.findOne).toHaveBeenCalledTimes(1);
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
      });

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(mockPayment.save).toHaveBeenCalled();
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
      });

      expect(result).toBeDefined();
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        {
          _id: 'coupon-123',
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        },
        { $inc: { usedCount: 1 } }
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
      });

      expect(result).toBeDefined();
      expect(Coupon.updateOne).toHaveBeenCalledTimes(1);
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'coupon-last',
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        }),
        { $inc: { usedCount: 1 } }
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
      })).rejects.toThrow('Coupon usage limit reached');

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
        }),
        PaymentService.verifyPayment(bookingB.bookingId, {
          razorpay_order_id: 'order_2',
          razorpay_payment_id: 'pay_2',
          razorpay_signature: razorpaySignature('order_2', 'pay_2'),
        }),
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
      });

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
  });
});

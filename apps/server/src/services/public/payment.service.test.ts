import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './payment.service';
import { BookingStatus, PaymentStatus } from '@mad/shared';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { getEnv } from '../../config/env';
import { getStripe } from '../../config/stripe';
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

vi.mock('../../models/refund.schema', () => ({
  Refund: {
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
    vi.mocked(Booking.findById).mockReset();
    vi.mocked(Booking.findOne).mockReset();
    vi.mocked(Booking.findOneAndUpdate).mockReset();
    vi.mocked(Event.findById).mockReset();
    vi.mocked(Event.findOneAndUpdate).mockReset();
    vi.mocked(Reservation.aggregate).mockReset();
    vi.mocked(SeatLayout.updateOne).mockReset();
    vi.mocked(Refund.create).mockReset();
    vi.mocked(Refund.findOne).mockReset();

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
      soldCount: 0,
      reservedCount: 0,
      totalCapacity: 100,
      bookingMode: 'general_admission',
      ticketTiers: [
        { tier: 'general', name: 'General Admission', price: 100, totalCapacity: 100, soldCount: 0 }
      ]
    } as any);

    vi.mocked(Reservation.aggregate).mockResolvedValue([{ total: 0 }]);
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
  });

  describe('verifyPayment', () => {
    it('should allow an authenticated booking owner to verify an already-paid payment idempotently', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.CONFIRMED,
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' },
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
      };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' },
        { sessionId: 'session-owner' }
      );

      expect(result).toBe(mockBooking);
      expect(mockPayment.save).not.toHaveBeenCalled();
    });

    it('should reject a different authenticated user before reading payment state', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.CONFIRMED,
      } as any);

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' },
          { userId: 'user-attacker' }
        )
      ).rejects.toThrow('You do not have access to this booking');
      expect(Payment.findOne).not.toHaveBeenCalled();
    });

    it('should reject a different guest session before reading payment state', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        sessionId: 'session-owner',
        status: BookingStatus.CONFIRMED,
      } as any);

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' },
          { sessionId: 'session-attacker' }
        )
      ).rejects.toThrow('You do not have access to this booking');
      expect(Payment.findOne).not.toHaveBeenCalled();
    });

    it('should require ownership before returning the already-paid idempotent path', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.CONFIRMED,
      } as any);

      await expect(
        PaymentService.verifyPayment(
          'MAD-2026-ABCDE',
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' }
        )
      ).rejects.toThrow('You do not have access to this booking');
      expect(Payment.findOne).not.toHaveBeenCalled();
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
      const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-ABCDE', status: BookingStatus.CONFIRMED };
      const mockPayment = { _id: 'p-123', gateway: 'razorpay', status: PaymentStatus.PAID, gatewayOrderId: 'order_123', gatewayPaymentId: 'pay_123', save: vi.fn() };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValue(mockPayment) } as any);

      const result = await PaymentService.verifyPayment('MAD-2026-ABCDE', {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: razorpaySignature('order_123', 'pay_123'),
      }, { trustedInternal: true });

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
      }, { trustedInternal: true });

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
      }, { trustedInternal: true });

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
      }, { trustedInternal: true });

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
    });

    it('should reject late recovery if seats are already booked', async () => {
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

      vi.mocked(SeatLayout.findOne).mockResolvedValue({
        eventId: 'e-123',
        seats: [{ seatId: 'seat-101', status: 'booked' }]
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      
      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(vi.mocked(Booking.findOneAndUpdate)).not.toHaveBeenCalled();
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

      // Simulate Thread 2 losing the confirmation race because Booking is already CONFIRMED
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null);
      const docQueryMock = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          if (docQueryMock.select.mock.calls.length > 0) {
            resolve({ status: BookingStatus.CONFIRMED, bookingId: 'b-123' });
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

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_CONCURRENT_CONFIRM');
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
      vi.mocked(Refund.findOne).mockResolvedValue(null); // No existing refund request

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
      expect(Refund.create).toHaveBeenCalledWith(expect.objectContaining({
        bookingId: 'b-123',
        paymentId: 'p-123',
        amount: 200,
        currency: 'INR',
        reason: 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED',
        status: 'requested',
      }));
    });
  });
});

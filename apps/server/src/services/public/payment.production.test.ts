import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { PaymentService } from './payment.service';
import { createRefund, processRefund } from '../admin/refund.service';
import { BookingStatus, PaymentStatus } from '@mad/shared';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { getEnv } from '../../config/env';
import * as Sentry from '@sentry/node';
import { auditLog } from '../../utils/audit';

const { mockSession } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      try {
        await callback(session);
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

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'production',
    APP_ENV: 'production',
    MOCK_PAYMENTS: false,
    RAZORPAY_KEY_ID: 'test_rzp_key',
    RAZORPAY_KEY_SECRET: 'test_rzp_secret',
    STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
    STRIPE_SECRET_KEY: 'test_stripe_secret',
  })),
  validateEnv: vi.fn(),
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

const createMockQuery = (val: any) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).lean = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  return query as any;
};

describe('Payment Production Integrity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Environment Validation', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.resetModules();
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should PASS environment validation with Development + mock payments', async () => {
      process.env.NODE_ENV = 'development';
      process.env.APP_ENV = 'local';
      process.env.MOCK_PAYMENTS = 'true';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_ADMIN_SECRET = 'b'.repeat(32);
      process.env.JWT_SESSION_SECRET = 'c'.repeat(32);

      const { validateEnv } = await vi.importActual<typeof import('../../config/env')>('../../config/env');
      expect(() => validateEnv()).not.toThrow();
    });

    it('should PASS environment validation with Staging + mock payments', async () => {
      process.env.NODE_ENV = 'development';
      process.env.APP_ENV = 'staging';
      process.env.MOCK_PAYMENTS = 'true';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_ADMIN_SECRET = 'b'.repeat(32);
      process.env.JWT_SESSION_SECRET = 'c'.repeat(32);

      const { validateEnv } = await vi.importActual<typeof import('../../config/env')>('../../config/env');
      expect(() => validateEnv()).not.toThrow();
    });

    it('should FAIL environment validation and throw with Production + mock payments', async () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';
      process.env.MOCK_PAYMENTS = 'true';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_ADMIN_SECRET = 'b'.repeat(32);
      process.env.JWT_SESSION_SECRET = 'c'.repeat(32);

      const { validateEnv } = await vi.importActual<typeof import('../../config/env')>('../../config/env');

      expect(() => validateEnv()).toThrow(/MOCK_PAYMENTS_PRODUCTION_BLOCKED/);
    });
  });

  describe('Runtime Protection', () => {
    beforeEach(() => {
      vi.mocked(getEnv).mockReturnValue({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        MOCK_PAYMENTS: false,
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
        STRIPE_SECRET_KEY: 'test_stripe_secret',
      } as any);
    });

    it('should FAIL createPaymentIntent in production with mock payments enabled', async () => {
      vi.mocked(getEnv).mockReturnValue({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        MOCK_PAYMENTS: true,
      } as any);

      const mockBooking = {
        _id: new Types.ObjectId(),
        bookingId: 'MAD-2026-ABCDE',
        userId: new Types.ObjectId(),
        status: BookingStatus.AWAITING_PAYMENT,
        totalAmount: 100,
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);

      await expect(
        PaymentService.createPaymentIntent(mockBooking._id.toString(), 'stripe', { userId: mockBooking.userId.toString() })
      ).rejects.toThrow(/MOCK_PAYMENTS_PRODUCTION_BLOCKED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED',
        status: 'failure',
      }));
    });

    it('should FAIL createPaymentIntent in production with mock bookingId identifier', async () => {
      await expect(
        PaymentService.createPaymentIntent('pi_mock_123', 'stripe')
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });

    it('should FAIL confirmStripePayment/verifyPayment in production with pi_mock_*', async () => {
      const mockBooking = {
        _id: new Types.ObjectId(),
        bookingId: 'MAD-2026-ABCDE',
        userId: new Types.ObjectId(),
        status: BookingStatus.AWAITING_PAYMENT,
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);

      await expect(
        PaymentService.verifyPayment(
          mockBooking._id.toString(),
          { paymentIntentId: 'pi_mock_123' },
          { userId: mockBooking.userId.toString() }
        )
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });

    it('should FAIL confirmRazorpayPayment/verifyPayment in production with pay_mock_*', async () => {
      const mockBooking = {
        _id: new Types.ObjectId(),
        bookingId: 'MAD-2026-ABCDE',
        userId: new Types.ObjectId(),
        status: BookingStatus.AWAITING_PAYMENT,
      };
      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);

      await expect(
        PaymentService.verifyPayment(
          mockBooking._id.toString(),
          { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_mock_123', razorpay_signature: 'sig' },
          { userId: mockBooking.userId.toString() }
        )
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });

    it('should FAIL webhook confirmation in production with order_mock_*', async () => {
      await expect(
        PaymentService.confirmFromWebhook('order_mock_123', 'pay_123', 'payment.captured', 'evt_123')
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });

    it('should FAIL Stripe webhook confirmation in production with pi_mock_*', async () => {
      await expect(
        PaymentService.confirmFromWebhookStripe(
          { id: 'pi_mock_123', metadata: { bookingId: 'b-123' } },
          'evt_123'
        )
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });
  });

  describe('Refund Protection', () => {
    beforeEach(() => {
      vi.mocked(getEnv).mockReturnValue({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        MOCK_PAYMENTS: false,
      } as any);
    });

    it('should FAIL createRefund using mock payment identifier', async () => {
      const mockPayment = {
        _id: new Types.ObjectId(),
        bookingId: new Types.ObjectId(),
        gatewayPaymentId: 'pay_mock_123',
        gateway: 'stripe',
        status: PaymentStatus.PAID,
        amount: 100,
      };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));

      await expect(
        createRefund({
          bookingId: mockPayment.bookingId.toString(),
          paymentId: mockPayment._id.toString(),
          amount: 50,
        })
      ).rejects.toThrow(/MOCK_PAYMENT_IDENTIFIER_DETECTED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
        status: 'failure',
      }));
    });

    it('should FAIL processRefund in production when payment gateway is mock', async () => {
      const mockRefund = {
        _id: new Types.ObjectId(),
        bookingId: new Types.ObjectId(),
        paymentId: new Types.ObjectId(),
        amount: 50,
        origin: 'manual',
        save: vi.fn(),
      };
      const mockPayment = {
        _id: mockRefund.paymentId,
        bookingId: mockRefund.bookingId,
        gateway: 'mock',
        status: PaymentStatus.PAID,
        amount: 100,
      };
      const mockBooking = {
        _id: mockRefund.bookingId,
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOneAndUpdate).mockResolvedValue(mockRefund as any);
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.find).mockResolvedValue([]);

      await expect(
        processRefund(mockRefund._id.toString(), 'approve', 'notes')
      ).rejects.toThrow(/MOCK_PAYMENT_RUNTIME_BLOCKED/);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MOCK_PAYMENT_RUNTIME_BLOCKED',
        status: 'failure',
      }));
    });
  });
});

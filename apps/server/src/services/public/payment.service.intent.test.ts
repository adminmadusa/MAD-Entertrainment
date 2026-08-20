import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { Booking } from '../../models/booking.schema';
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

describe('Payment Service — createPaymentIntent', () => {
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

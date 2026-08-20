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

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOneAndUpdate: vi.fn(),
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

const razorpaySignature = (orderId: string, paymentId: string) =>
  crypto
    .createHmac('sha256', 'test_rzp_secret')
    .update(orderId + '|' + paymentId)
    .digest('hex');

describe('BUG-297 — verifyPayment PAID path (validateGatewayProof)', () => {
  const bookingObjectId = new mongoose.Types.ObjectId();
  const bookingIdStr = bookingObjectId.toHexString();

  const confirmedBooking = {
    _id: bookingObjectId,
    bookingId: 'MAD-BOOKING-001',
    eventId: 'e-123',
    totalAmount: 100,
    currency: 'inr',
    status: 'confirmed',
    userId: new mongoose.Types.ObjectId(),
    sessionId: 'old-session-id',
    save: vi.fn().mockResolvedValue(undefined),
  };

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
    vi.clearAllMocks();
    vi.mocked(Booking.findOne).mockImplementation(() =>
      createMockQuery(confirmedBooking) as any
    );
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
    vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
  });

  it('[BUG-297][POSITIVE] Stripe — webhook wins, rotated session, full proof passes → 200', async () => {
    vi.mocked(Payment.findOne).mockImplementation(() =>
      createMockQuery(makeStripePayment()) as any
    );
    const mockStripe = {
      paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as any);

    const result = await PaymentService.verifyPayment(
      bookingIdStr,
      { paymentIntentId: 'pi_test_001' },
      { sessionId: 'new-rotated-session' }
    );

    expect(result).toBeDefined();
    expect(result._id.toString()).toBe(bookingIdStr);
    expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001');
  });

  it('[BUG-297][POSITIVE] Razorpay — webhook wins, rotated session, full proof passes → 200', async () => {
    vi.mocked(Payment.findOne).mockImplementation(() =>
      createMockQuery(makeRazorpayPayment()) as any
    );
    vi.mocked(Payment.findOne)
      .mockImplementationOnce(() => createMockQuery(makeRazorpayPayment()) as any)
      .mockImplementationOnce(() => createMockQuery(null) as any);

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
          amount_received: 5000,
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
          currency: 'usd',
        }),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as any);

    await expect(
      PaymentService.verifyPayment(bookingIdStr, { paymentIntentId: 'pi_test_001' }, {})
    ).rejects.toThrow('Payment currency does not match booking currency');
  });

  it('[BUG-297][NEGATIVE] Razorpay — PAID booking, order ID mismatch → 400', async () => {
    vi.mocked(Payment.findOne).mockImplementation(() =>
      createMockQuery(makeRazorpayPayment()) as any
    );
    const sig = razorpaySignature('order_other', 'pay_rzp_001');

    await expect(
      PaymentService.verifyPayment(
        bookingIdStr,
        {
          razorpay_order_id: 'order_other',
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
      .mockImplementationOnce(() => createMockQuery(payment) as any)
      .mockImplementationOnce(() =>
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
        },
        {}
      )
    ).rejects.toThrow('Missing Razorpay credentials in payment payload');
  });

  it('[BUG-297][REGRESSION] Stripe PAID path — no paymentIntentId in payload → 400 (zero-proof shortcut removed)', async () => {
    vi.mocked(Payment.findOne).mockImplementation(() =>
      createMockQuery(makeStripePayment()) as any
    );

    await expect(
      PaymentService.verifyPayment(bookingIdStr, {}, {})
    ).rejects.toThrow();
  });

  it('[BUG-297] does not overwrite existing authenticated owner when gateway proof is valid but ownership context belongs to a different authenticated user', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const mockBooking = {
      _id: bookingObjectId,
      bookingId: 'MAD-BOOKING-001',
      eventId: 'e-123',
      totalAmount: 100,
      currency: 'inr',
      status: 'confirmed',
      userId: userAId,
      sessionId: 'session-old',
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Booking.findOne).mockImplementation(() =>
      createMockQuery(mockBooking) as any
    );

    vi.mocked(Payment.findOne).mockImplementation(() =>
      createMockQuery(makeStripePayment()) as any
    );

    const mockStripe = {
      paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as any);

    const userBId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      PaymentService.verifyPayment(
        bookingIdStr,
        { paymentIntentId: 'pi_test_001' },
        { userId: userBId }
      )
    ).rejects.toThrow('You do not have access to this booking');

    expect(mockBooking.userId).toEqual(userAId);
  });

  it('[BUG-297] rotated guest session recovers ownership (PENDING payment)', async () => {
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

    const result = await PaymentService.verifyPayment(
      bookingIdStr,
      { paymentIntentId: 'pi_test_001' },
      { sessionId: 'session-new-rotated' }
    );

    expect(result).toBeDefined();
    expect(mockBooking.sessionId).toBe('session-new-rotated');
    expect(mockBooking.userId).toBeUndefined();
    expect(mockBooking.save).toHaveBeenCalled();
  });

  it('[BUG-297] rotated guest session recovers ownership (PAID payment)', async () => {
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

    const mockStripe = {
      paymentIntents: { retrieve: vi.fn().mockResolvedValue(validStripeIntent) },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as any);

    const result = await PaymentService.verifyPayment(
      bookingIdStr,
      { paymentIntentId: 'pi_test_001' },
      { sessionId: 'session-new-rotated' }
    );

    expect(result).toBeDefined();
    expect(mockBooking.sessionId).toBe('session-new-rotated');
    expect(mockBooking.userId).toBeUndefined();
    expect(mockBooking.save).toHaveBeenCalled();
  });
});

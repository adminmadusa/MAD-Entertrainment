import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { PaymentConsistencyService } from './payment-consistency.service';
import { PaymentService } from '../public/payment.service';

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
    },
    startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
  };
});

const { mockTriggerRefundRequest } = vi.hoisted(() => ({
  mockTriggerRefundRequest: vi.fn(),
}));

vi.mock('../public/payment.service', () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('../public/payment-refund.service', () => ({
  PaymentRefundService: {
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue([]),
}));

const mockCreateMockQuery = (resolvedValue: any = []) => {
  const query: any = {
    sort: vi.fn().mockImplementation(() => query),
    limit: vi.fn().mockImplementation(() => query),
    select: vi.fn().mockImplementation(() => query),
    lean: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    then: vi.fn().mockImplementation((resolve) => resolve(resolvedValue)),
  };
  return query;
};

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
    expireReservations: vi.fn().mockResolvedValue([]),
    groupByEvent: vi.fn(() => new Map()),
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

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../config/queue.config', () => ({
  getQueueName: vi.fn((name: string) => `${name}-test`),
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
    countDocuments: vi.fn(() => mockCreateMockQuery(0)),
    updateOne: vi.fn(() => mockCreateMockQuery({ modifiedCount: 1 })),
  },
}));

vi.mock('../../config/redis', () => ({
  isRedisConnected: vi.fn(() => false),
  getRedis: vi.fn(),
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('ConsistencyService - Paid Payment Recovery Watchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should count paid payment mismatches correctly', async () => {
    const mockPayments = [
      { _id: 'pay-1', bookingId: 'b-1' },
      { _id: 'pay-2', bookingId: 'b-2' },
    ];
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery(mockPayments) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.AWAITING_PAYMENT }) as any) // pay-1
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any); // pay-2

    const count = await PaymentConsistencyService.countPaidPaymentMismatches();
    expect(count).toBe(1);
    expect(Payment.find).toHaveBeenCalled();
  });

  it('should attempt recovery (confirmBooking) for Case A and succeed', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.AWAITING_PAYMENT,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(mockBooking) as any) // first find in loop
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any); // check after confirmation

    vi.mocked(PaymentService.confirmBooking).mockResolvedValue({ status: BookingStatus.CONFIRMED } as any);

    const repaired = await PaymentConsistencyService.repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(mockBooking, mockPayment);
    expect(PaymentService.triggerRefundRequest).not.toHaveBeenCalled();
    expect(mockPayment.save).not.toHaveBeenCalled();
  });

  it('should handle Case B (recovery fails/capacity exhausted) by failing payment and requesting refund', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.AWAITING_PAYMENT,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(mockBooking) as any) // first find in loop
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.AWAITING_PAYMENT }) as any); // check after confirmation (still awaiting payment)

    vi.mocked(PaymentService.confirmBooking).mockResolvedValue(null as any); // confirmBooking returns null/falsy

    const repaired = await PaymentConsistencyService.repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(mockBooking, mockPayment);
    expect(mockPayment.status).toBe(PaymentStatus.FAILED);
    expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED');
    expect(mockPayment.save).toHaveBeenCalled();
    expect(PaymentService.triggerRefundRequest).toHaveBeenCalledWith(mockBooking, mockPayment, 'LATE_PAYMENT_RECOVERY_REJECTED');
  });

  it('should handle Case C (booking already unrecoverable cancelled/failed) by failing payment and requesting refund', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.CANCELLED,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery(mockBooking) as any);

    const repaired = await PaymentConsistencyService.repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).not.toHaveBeenCalled();
    expect(mockPayment.status).toBe(PaymentStatus.FAILED);
    expect(mockPayment.failureReason).toBe('BOOKING_UNRECOVERABLE');
    expect(mockPayment.save).toHaveBeenCalled();
    expect(PaymentService.triggerRefundRequest).toHaveBeenCalledWith(mockBooking, mockPayment, 'BOOKING_UNRECOVERABLE');
  });
});

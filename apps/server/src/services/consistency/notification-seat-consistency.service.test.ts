import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { ConsistencyService } from '../consistency.service';
import { BookingConsistencyService } from './booking-consistency.service';
import { NotificationConsistencyService } from './notification-consistency.service';
import { PaymentConsistencyService } from './payment-consistency.service';
import { RefundConsistencyService } from './refund-consistency.service';
import { PaymentService } from '../public/payment.service';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';

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
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    exists: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([]),
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

describe('ConsistencyService - Stuck Processing, Notifications, Optimistic Locking, and Stale Seats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset stuck processing refunds back to requested status', async () => {
    const mockRefund = {
      _id: 'ref-stuck-1',
      paymentId: 'pay-1',
      bookingId: 'book-1',
      amount: 100,
    };

    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([mockRefund]) as any);
    vi.mocked(Refund.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const resetCount = await RefundConsistencyService.repairStuckProcessingRefunds();
    expect(resetCount).toBe(1);
    expect(Refund.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        updatedAt: { $lte: expect.any(Date) }
      })
    );
    expect(Refund.updateOne).toHaveBeenCalledWith(
      { _id: 'ref-stuck-1', status: 'processing' },
      { $set: { status: 'requested' } }
    );
  });

  it('should recover orphaned completed refund notifications', async () => {
    const mockRefund = {
      _id: 'ref-orph-1',
      bookingId: 'book-orph-1',
      paymentId: 'pay-orph-1',
      amount: 150,
      status: 'completed',
      processedAt: new Date(),
    };

    vi.mocked(Refund.find).mockImplementation((filter: any) => {
      if (filter.status === 'completed') {
        return mockCreateMockQuery([mockRefund]);
      }
      return mockCreateMockQuery([]);
    });

    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    const mockBooking = {
      _id: 'book-orph-1',
      bookingId: 'MAD-REF-1',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      totalAmount: 300,
      eventId: 'event-1',
      currency: 'INR',
    };
    vi.mocked(Booking.findById).mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockBooking)
    } as any);

    const mockPayment = {
      _id: 'pay-orph-1',
      amount: 300,
    };
    (Payment as any).findById = vi.fn().mockResolvedValue(mockPayment);

    const mockEvent = {
      _id: 'event-1',
      title: 'MAD Concert',
    };
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const count = await RefundConsistencyService.repairOrphanedRefundNotifications();
    expect(count).toBe(1);
    expect(Notification.exists).toHaveBeenCalledWith({
      bookingId: 'book-orph-1',
      jobId: { $regex: '^refund-ref-orph-1' }
    });
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.PARTIAL_REFUND,
      }),
      expect.stringMatching(/^refund-ref-orph-1-\d+$/)
    );
  });

  it('should recover orphaned cancellation notifications', async () => {
    const mockBooking = {
      _id: 'book-cancel-1',
      bookingId: 'MAD-CANCEL-1',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      eventId: 'event-1',
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    };

    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    const mockEvent = {
      _id: 'event-1',
      title: 'MAD Concert',
      startDate: new Date(),
      venue: 'Arena 1',
    };
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const count = await RefundConsistencyService.repairOrphanedCancellationNotifications();
    expect(count).toBe(1);
    expect(Notification.exists).toHaveBeenCalledWith({
      bookingId: 'book-cancel-1',
      type: NotificationType.EVENT_CANCELLED,
    });
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.EVENT_CANCELLED,
      }),
      'cancellation-MAD-CANCEL-1-retry'
    );
  });

  const setupInventoryRepairCycle = ({
    event,
    soldTotal,
    reservedTotal = 0,
    confirmedBookingDocs = [],
    updateResult = { modifiedCount: 1 },
  }: {
    event: any;
    soldTotal: number;
    reservedTotal?: number;
    confirmedBookingDocs?: any[];
    updateResult?: { modifiedCount: number };
  }) => {
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([event]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: soldTotal }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: reservedTotal }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter?.eventId === event._id && filter?.status === BookingStatus.CONFIRMED) {
        return mockCreateMockQuery(confirmedBookingDocs);
      }
      return mockCreateMockQuery([]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue(updateResult);
    (Event as any).updateOne = mockEventUpdateOne;

    return mockEventUpdateOne;
  };

  it('should execute event inventory repair and handle optimistic lock conflicts', async () => {
    // 1. Setup mock Event that needs repair
    const mockEvent = {
      _id: 'event-inv-1',
      soldCount: 5,
      reservedCount: 2,
      totalCapacity: 20,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 3 }],
      eventVersion: 1,
    };

    // Aggregate calls inside repairEventInventoryMismatches: confirmedBookings & activeReservations
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 5 }]);
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]) as any);

    // Mock other watchdog queries to return empty arrays to avoid running other checks
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      // For general bookings query inside other watchdogs
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
    });

    // Mock count / stats queries for generateReport
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    // Dynamic mock for Event.updateOne
    const mockEventUpdateOne = vi.fn()
      .mockResolvedValueOnce({ modifiedCount: 0 }) // Conflict first
      .mockResolvedValueOnce({ modifiedCount: 1 }); // Success second

    (Event as any).updateOne = mockEventUpdateOne;

    // First cycle run: conflict scenario
    const report1 = await ConsistencyService.runRepairCycle();
    expect(report1.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-inv-1', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ soldCount: 10, reservedCount: 5, isSoldOut: false }),
        $inc: { eventVersion: 1 }
      })
    );

    // Second cycle run: success scenario
    const report2 = await ConsistencyService.runRepairCycle();
    expect(report2.repairs?.eventInventoryMismatchesRepaired).toBe(1);
  });

  it('should repair isSoldOut to true when sold count exhausts capacity', async () => {
    const mockEvent = {
      _id: 'event-sold-out-true',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = mockEventUpdateOne;

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-sold-out-true', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true }),
      })
    );
  });

  it('should repair isSoldOut to false when sold count is below capacity', async () => {
    const mockEvent = {
      _id: 'event-sold-out-false',
      soldCount: 9,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 9 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 9 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 9 }] }]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = mockEventUpdateOne;

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-sold-out-false', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false }),
      })
    );
  });

  it('should not throw and should emit logger.warn when a booking has tickets: undefined (malformed document)', async () => {
    const { logger } = await import('../../utils/logger');

    const mockEvent = {
      _id: 'event-corrupt-1',
      soldCount: 5,
      reservedCount: 0,
      totalCapacity: 20,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 5 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);

    // Simulate a malformed document from .lean() — tickets field is missing/undefined
    const malformedBookingDoc = {
      _id: 'b-corrupt-1',
      bookingId: 'MAD-2026-CORRUPT',
      tickets: undefined,
    };
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([malformedBookingDoc]);
    });

    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);
    (Event as any).updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

    // Should not throw despite the malformed document
    await expect(ConsistencyService.runRepairCycle()).resolves.toBeDefined();

    // Warning must have been emitted with booking identifiers
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'b-corrupt-1',
        bookingRef: 'MAD-2026-CORRUPT',
        ticketsType: 'undefined',
      }),
      expect.stringContaining('invalid tickets structure')
    );
  });

  it('repairs stale isSoldOut true to false when capacity is available', async () => {
    const event = {
      _id: 'event-stale-true',
      soldCount: 9,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 9 }],
      eventVersion: 3,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 9,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 9 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-stale-true', eventVersion: 3 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false, soldCount: 9, reservedCount: 0 }),
        $inc: { eventVersion: 1 },
      })
    );
  });

  it('repairs stale isSoldOut false to true when sold count reaches capacity', async () => {
    const event = {
      _id: 'event-stale-false',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 4,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 10,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 10 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-stale-false', eventVersion: 4 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true, soldCount: 10, reservedCount: 0 }),
        $inc: { eventVersion: 1 },
      })
    );
  });

  it('is idempotent when rerun after isSoldOut reconciliation', async () => {
    const staleEvent = {
      _id: 'event-idempotent',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 2,
    };
    const repairedEvent = {
      ...staleEvent,
      isSoldOut: true,
      eventVersion: 3,
    };

    vi.mocked(Event.find)
      .mockReturnValueOnce(mockCreateMockQuery([staleEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([staleEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([repairedEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([repairedEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter?.eventId === 'event-idempotent' && filter?.status === BookingStatus.CONFIRMED) {
        return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
      }
      return mockCreateMockQuery([]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);
    const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = updateOne;

    const firstReport = await ConsistencyService.runRepairCycle();
    const secondReport = await ConsistencyService.runRepairCycle();

    expect(firstReport.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(secondReport.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it('clears sold-out state after capacity increases above sold count', async () => {
    const event = {
      _id: 'event-capacity-increase',
      soldCount: 100,
      reservedCount: 0,
      totalCapacity: 150,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 100 }],
      eventVersion: 7,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 100,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 100 }] }],
    });

    await ConsistencyService.runRepairCycle();

    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-capacity-increase', eventVersion: 7 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false }),
      })
    );
  });

  it('keeps sold-out state after cancellation when sold count still meets capacity', async () => {
    const event = {
      _id: 'event-cancel-recalc',
      soldCount: 120,
      reservedCount: 0,
      totalCapacity: 100,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 120 }],
      eventVersion: 8,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 120,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 120 }] }],
    });

    await ConsistencyService.runRepairCycle();

    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-cancel-recalc', eventVersion: 8 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true }),
      })
    );
  });

  it('does not repair inventory when isSoldOut already matches sold count and capacity', async () => {
    const event = {
      _id: 'event-noop',
      soldCount: 5,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 5 }],
      eventVersion: 9,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 5,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 5 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('should reclaim stale seat locks without the 24-hour window constraint', async () => {
    const mockReservation = {
      _id: 'res-stale-1',
      eventId: 'event-1',
      seatId: 'seat-A1',
      reservationId: 'res-abc',
    };

    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([mockReservation]) as any);
    vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    // Mock other watchdog queries to return empty/0
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const report = await ConsistencyService.runRepairCycle();
    expect(report.repairs?.staleSeatReservations).toBe(1);
    expect(Reservation.find).toHaveBeenCalledWith({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    });
    expect(SeatLayout.updateOne).toHaveBeenCalledWith(
      { eventId: 'event-1' },
      expect.objectContaining({
        $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
      }),
      expect.objectContaining({
        arrayFilters: [{
          'seat.seatId': 'seat-A1',
          'seat.status': SeatStatus.LOCKED,
          'seat.reservationId': 'res-abc',
        }]
      })
    );
  });
});

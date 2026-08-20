import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, NotificationType } from '@mad/shared';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Notification } from '../models/notification.schema';
import { Payment } from '../models/payment.schema';
import { Refund } from '../models/refund.schema';
import { Reservation } from '../models/reservation.schema';
import { Ticket } from '../models/ticket.schema';
import { ConsistencyService } from './consistency.service';
import { NotificationConsistencyService } from './consistency/notification-consistency.service';
import { QueueService } from './queue.service';

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

vi.mock('./public/payment.service', () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('./public/payment-refund.service', () => ({
  PaymentRefundService: {
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('./notification.service', () => ({
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

vi.mock('../models/booking.schema', () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/notification.schema', () => ({
  Notification: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('./reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
    expireReservations: vi.fn().mockResolvedValue([]),
    groupByEvent: vi.fn(() => new Map()),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('./queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../config/queue.config', () => ({
  getQueueName: vi.fn((name: string) => `${name}-test`),
}));

vi.mock('../models/reservation.schema', () => ({
  Reservation: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/payment.schema', () => ({
  Payment: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/refund.schema', () => ({
  Refund: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
    countDocuments: vi.fn(() => mockCreateMockQuery(0)),
    updateOne: vi.fn(() => mockCreateMockQuery({ modifiedCount: 1 })),
  },
}));

vi.mock('../config/redis', () => ({
  isRedisConnected: vi.fn(() => false),
  getRedis: vi.fn(),
}));

vi.mock('../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('ConsistencyService - Pipeline Watchdog (PR-T4A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);
  });

  // Test 1: Stuck Notification Repair - Safety Ordering (no update if enqueue fails)
  it('should not update notification status in DB if QueueService.enqueue fails', async () => {
    const mockNotification = {
      _id: 'n-stuck-1',
      bookingId: 'b-confirmed-stuck-1',
      status: 'queued',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-1',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);

    vi.mocked(QueueService.enqueue).mockRejectedValue(new Error('Queue offline'));

    const count = await NotificationConsistencyService.repairStuckNotifications();

    expect(count).toBe(0);
    expect(QueueService.enqueue).toHaveBeenCalled();
    expect(Notification.updateOne).not.toHaveBeenCalled();
  });

  // Test 2: Stuck Notification Repair - Successful Enqueue transitions status conditionally
  it('should conditionally update notification status in DB to failed if enqueue succeeds', async () => {
    const mockNotification = {
      _id: 'n-stuck-2',
      bookingId: 'b-confirmed-stuck-2',
      status: 'processing',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-2',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await NotificationConsistencyService.repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'pdf-queue-test',
      'pdf:generate',
      {
        bookingId: 'b-confirmed-stuck-2',
        eventId: 'e-123',
        recipientEmail: 'guest@example.com',
        guestName: 'Guest User',
      },
      'pdf:generate:b-confirmed-stuck-2'
    );
    expect(Notification.updateOne).toHaveBeenCalledWith(
      {
        _id: 'n-stuck-2',
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
        },
      }
    );
  });

  // Test 3: Stuck Notification - Conditional transition avoids overwriting sent state
  it('should handle update failure if status was modified concurrently to sent', async () => {
    const mockNotification = {
      _id: 'n-stuck-3',
      bookingId: 'b-confirmed-stuck-3',
      status: 'processing',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-3',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

    const count = await NotificationConsistencyService.repairStuckNotifications();

    expect(count).toBe(0);
  });

  // Test 3B: Stuck Refund Notification Repair
  it('should recover stuck refund notifications independently of booking confirmed status', async () => {
    const mockNotification = {
      _id: 'n-stuck-refund-1',
      bookingId: 'b-refund-stuck',
      status: 'queued',
      type: NotificationType.FULL_REFUND,
      jobId: 'refund-ref-123-timestamp',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);

    const mockRefund = {
      _id: 'ref-123',
      paymentId: 'p-123',
      amount: 500,
      status: 'completed',
      processedAt: new Date(),
    };
    vi.mocked(Refund.findById).mockResolvedValue(mockRefund as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([mockRefund]) as any);

    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-refund-stuck',
      bookingId: 'MAD-2026-REF',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.REFUNDED,
      totalAmount: 500,
    }) as any);

    vi.mocked(Event.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'e-123',
      title: 'Event Title',
    }) as any);

    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await NotificationConsistencyService.repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.FULL_REFUND,
        bookingId: 'b-refund-stuck',
      }),
      expect.stringContaining('refund-ref-123-')
    );
    expect(Notification.updateOne).toHaveBeenCalledWith(
      {
        _id: 'n-stuck-refund-1',
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
        },
      }
    );
  });

  // Test 3C: Stuck Event Cancellation Notification Repair
  it('should recover stuck event cancellation notifications independently of booking confirmed status', async () => {
    const mockNotification = {
      _id: 'n-stuck-cancel-1',
      bookingId: 'b-cancel-stuck',
      status: 'queued',
      type: NotificationType.EVENT_CANCELLED,
      jobId: 'cancellation-MAD-2026-timestamp',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);

    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-cancel-stuck',
      bookingId: 'MAD-2026-CANCEL',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CANCELLED,
    }) as any);

    vi.mocked(Event.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'e-123',
      title: 'Event Title',
      venue: 'Event Venue',
      startDate: new Date(),
    }) as any);

    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await NotificationConsistencyService.repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.EVENT_CANCELLED,
        bookingId: 'b-cancel-stuck',
      }),
      expect.stringContaining('cancellation-MAD-2026-CANCEL-')
    );
  });

  // Test 4: Orphaned Confirmed Deliveries - Successful repair & final sent verification
  it('should repair orphaned confirmed deliveries only if tickets exist and no sent notification exists', async () => {
    const mockBooking = {
      _id: 'b-orphaned-1',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);

    vi.mocked(Notification.exists)
      .mockResolvedValueOnce(false as any) // first call in loop
      .mockResolvedValueOnce(false as any); // final verification check

    const count = await NotificationConsistencyService.repairOrphanedConfirmedDeliveries();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'pdf-queue-test',
      'pdf:generate',
      {
        bookingId: 'b-orphaned-1',
        eventId: 'e-123',
        recipientEmail: 'guest@example.com',
        guestName: 'Guest User',
      },
      'pdf:generate:b-orphaned-1'
    );
  });

  // Test 5: Orphaned Confirmed Deliveries - Race condition check
  it('should skip repair if final sent check verification finds notification was completed concurrently', async () => {
    const mockBooking = {
      _id: 'b-orphaned-2',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);

    vi.mocked(Notification.exists)
      .mockResolvedValueOnce(false as any) // first check
      .mockResolvedValueOnce(true as any); // final check

    const count = await NotificationConsistencyService.repairOrphanedConfirmedDeliveries();

    expect(count).toBe(0);
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  // Test 6: Report metrics
  it('should fetch correct report drift metrics for pipeline faults', async () => {
    vi.mocked(Notification.countDocuments).mockResolvedValue(4);
    const mockBooking = { _id: 'b-orph-3', totalTickets: 1 };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(1);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));

    const report = await ConsistencyService.generateReport();

    expect(report.drift.stuckNotifications).toBe(4);
    expect(report.drift.orphanedConfirmedDeliveries).toBe(1);
  });

  // Test 7: Integration in runRepairCycle
  it('should execute pipeline watchdog repair methods in runRepairCycle', async () => {
    const stuckSpy = vi.spyOn(NotificationConsistencyService, 'repairStuckNotifications').mockResolvedValue(5);
    const orphanedSpy = vi.spyOn(NotificationConsistencyService, 'repairOrphanedConfirmedDeliveries').mockResolvedValue(7);

    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const report = await ConsistencyService.runRepairCycle();

    expect(stuckSpy).toHaveBeenCalled();
    expect(orphanedSpy).toHaveBeenCalled();
    expect(report.repairs?.resetStuckNotifications).toBe(5);
    expect(report.repairs?.reEnqueuedOrphanedDeliveries).toBe(7);

    stuckSpy.mockRestore();
    orphanedSpy.mockRestore();
  });
});

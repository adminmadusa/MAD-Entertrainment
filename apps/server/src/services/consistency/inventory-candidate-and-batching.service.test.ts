import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { EventStatus } from '@mad/shared';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Ticket } from '../../models/ticket.schema';
import { BookingConsistencyService } from './booking-consistency.service';
import { NotificationConsistencyService } from './notification-consistency.service';
import { SeatConsistencyService } from './seat-consistency.service';
import { QueueService } from '../queue.service';

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
    distinct: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(true),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    find: vi.fn(() => mockCreateMockQuery([])),
    distinct: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    find: vi.fn(() => mockCreateMockQuery([])),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    findOne: vi.fn(),
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

vi.mock('../../config/redis', () => ({
  isRedisConnected: vi.fn(() => false),
  getRedis: vi.fn(),
}));

describe('PR 2: Event Inventory Candidate Filtering & Query Batching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Event Inventory Candidate Filtering (SeatConsistencyService)', () => {
    it('should generate candidate filter covering published events, reservedCount > 0, and recent window', async () => {
      const fixedEventId = new Types.ObjectId();
      vi.mocked(Booking.distinct).mockResolvedValue([fixedEventId.toString()]);

      const filter = await SeatConsistencyService.getInventoryCandidateFilter();

      expect(filter.isDeleted).toEqual({ $ne: true });
      expect(filter.$or).toBeDefined();
      expect(filter.$or).toContainEqual({ status: EventStatus.PUBLISHED });
      expect(filter.$or).toContainEqual({ reservedCount: { $gt: 0 } });

      const updatedAtClause = filter.$or?.find((c: any) => c.updatedAt);
      expect(updatedAtClause).toBeDefined();
      expect(updatedAtClause?.updatedAt?.$gte).toBeInstanceOf(Date);

      const idClause = filter.$or?.find((c: any) => c._id);
      expect(idClause).toBeDefined();
      expect(idClause?._id?.$in).toContain(fixedEventId.toString());
    });

    it('should safely handle empty, null, and invalid booking eventId references', async () => {
      vi.mocked(Booking.distinct).mockResolvedValue([null, undefined, '', 'not-a-valid-id', 12345 as any]);

      const filter = await SeatConsistencyService.getInventoryCandidateFilter();

      expect(filter.isDeleted).toEqual({ $ne: true });
      expect(filter.$or).toBeDefined();
      const idClause = filter.$or?.find((c: any) => c._id);
      expect(idClause).toBeUndefined();
    });

    it('should safely recover when Booking.distinct throws database error', async () => {
      vi.mocked(Booking.distinct).mockRejectedValue(new Error('MongoNetworkError'));

      const filter = await SeatConsistencyService.getInventoryCandidateFilter();

      expect(filter.isDeleted).toEqual({ $ne: true });
      expect(filter.$or).toContainEqual({ status: EventStatus.PUBLISHED });
      expect(filter.$or).toContainEqual({ reservedCount: { $gt: 0 } });
    });

    it('should enforce soft-deletion exclusion so deleted events are never selected', async () => {
      vi.mocked(Booking.distinct).mockResolvedValue([]);

      const filter = await SeatConsistencyService.getInventoryCandidateFilter();

      expect(filter.isDeleted).toEqual({ $ne: true });
    });

    it('should pass candidate filter to Event.find in countEventInventoryMismatches', async () => {
      vi.mocked(Booking.distinct).mockResolvedValue([]);
      vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]) as any);

      const mismatches = await SeatConsistencyService.countEventInventoryMismatches();

      expect(mismatches).toBe(0);
      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: { $ne: true },
          $or: expect.any(Array),
        })
      );
    });

    it('should pass candidate filter to Event.find in repairEventInventoryMismatches', async () => {
      vi.mocked(Booking.distinct).mockResolvedValue([]);
      vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]) as any);

      const repaired = await SeatConsistencyService.repairEventInventoryMismatches();

      expect(repaired).toBe(0);
      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: { $ne: true },
          $or: expect.any(Array),
        })
      );
    });
  });

  describe('2. Batched Ticket Count Optimization (BookingConsistencyService)', () => {
    it('should return empty map immediately when candidate list is empty', async () => {
      const result = await BookingConsistencyService.getTicketCountsByBookingIds([]);
      expect(result.size).toBe(0);
      expect(Ticket.aggregate).not.toHaveBeenCalled();
    });

    it('should use grouped aggregation to count tickets across all booking candidates', async () => {
      const b1 = new Types.ObjectId();
      const b2 = new Types.ObjectId();
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        { _id: b1, count: 3 },
        { _id: b2, count: 2 },
      ]);

      const map = await BookingConsistencyService.getTicketCountsByBookingIds([b1, b2]);

      expect(Ticket.aggregate).toHaveBeenCalledTimes(1);
      expect(Ticket.aggregate).toHaveBeenCalledWith([
        { $match: { bookingId: { $in: [b1, b2] } } },
        { $group: { _id: '$bookingId', count: { $sum: 1 } } },
      ]);
      expect(map.get(b1.toString())).toBe(3);
      expect(map.get(b2.toString())).toBe(2);
    });

    it('should partition large candidate lists into bounded batches of 100', async () => {
      const manyIds = Array.from({ length: 250 }, () => new Types.ObjectId());
      vi.mocked(Ticket.aggregate).mockResolvedValue([]);

      await BookingConsistencyService.getTicketCountsByBookingIds(manyIds, 100);

      expect(Ticket.aggregate).toHaveBeenCalledTimes(3);
    });

    it('should detect both missing and duplicate ticket mismatches', async () => {
      const bMissing = new Types.ObjectId();
      const bDuplicate = new Types.ObjectId();
      const bMatching = new Types.ObjectId();

      const candidates = [
        { _id: bMissing, totalTickets: 2 },
        { _id: bDuplicate, totalTickets: 2 },
        { _id: bMatching, totalTickets: 2 },
      ];

      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery(candidates) as any);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        { _id: bMissing, count: 1 }, // 1 < 2 (missing)
        { _id: bDuplicate, count: 3 }, // 3 > 2 (duplicate)
        { _id: bMatching, count: 2 }, // 2 === 2 (matching)
      ]);

      const count = await BookingConsistencyService.countUnticketedConfirmedBookings();

      expect(count).toBe(2); // bMissing and bDuplicate are counted
    });

    it('should re-enqueue repair for unticketed bookings using batched counts', async () => {
      const bUnticketed = new Types.ObjectId();
      const candidates = [{ _id: bUnticketed, totalTickets: 2 }];

      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery(candidates) as any);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        { _id: bUnticketed, count: 0 },
      ]);
      vi.mocked(Booking.exists).mockResolvedValue(true);

      const repaired = await BookingConsistencyService.repairUnticketedConfirmedBookings();

      expect(repaired).toBe(1);
      expect(QueueService.enqueue).toHaveBeenCalledWith(
        'booking-queue-test',
        'booking:confirm',
        { bookingId: bUnticketed.toString() },
        `booking:confirm:${bUnticketed}`
      );
    });

    it('should gracefully handle aggregate failure without crashing', async () => {
      const b1 = new Types.ObjectId();
      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([{ _id: b1, totalTickets: 1 }]) as any);
      vi.mocked(Ticket.aggregate).mockRejectedValue(new Error('AggregationFailed'));

      const repaired = await BookingConsistencyService.repairUnticketedConfirmedBookings();
      expect(repaired).toBe(0);
    });
  });

  describe('3. Batched Notification Existence Checks (NotificationConsistencyService)', () => {
    it('should return empty set when candidate list is empty', async () => {
      const set = await NotificationConsistencyService.getSentNotificationBookingIds([]);
      expect(set.size).toBe(0);
      expect(Notification.distinct).not.toHaveBeenCalled();
    });

    it('should batch lookup sent notifications using distinct', async () => {
      const b1 = new Types.ObjectId();
      const b2 = new Types.ObjectId();
      vi.mocked(Notification.distinct).mockResolvedValue([b1.toString()]);

      const set = await NotificationConsistencyService.getSentNotificationBookingIds([b1, b2]);

      expect(Notification.distinct).toHaveBeenCalledTimes(1);
      expect(Notification.distinct).toHaveBeenCalledWith('bookingId', {
        bookingId: { $in: [b1, b2] },
        status: 'sent',
      });
      expect(set.has(b1.toString())).toBe(true);
      expect(set.has(b2.toString())).toBe(false);
    });

    it('should skip repair when notification is already sent', async () => {
      const bSent = new Types.ObjectId();
      const candidates = [
        {
          _id: bSent,
          eventId: new Types.ObjectId(),
          guestEmail: 'test@mad.com',
          guestName: 'Test',
          totalTickets: 1,
        },
      ];

      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery(candidates) as any);
      vi.mocked(Ticket.aggregate).mockResolvedValue([{ _id: bSent, count: 1 }]);
      vi.mocked(Notification.distinct).mockResolvedValue([bSent.toString()]);

      const repaired = await NotificationConsistencyService.repairOrphanedConfirmedDeliveries();

      expect(repaired).toBe(0);
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should repair orphaned delivery when notification is missing and tickets match', async () => {
      const bOrphaned = new Types.ObjectId();
      const eventId = new Types.ObjectId();
      const candidates = [
        {
          _id: bOrphaned,
          eventId,
          guestEmail: 'orphan@mad.com',
          guestName: 'Orphan User',
          totalTickets: 2,
        },
      ];

      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery(candidates) as any);
      vi.mocked(Ticket.aggregate).mockResolvedValue([{ _id: bOrphaned, count: 2 }]);
      vi.mocked(Notification.distinct).mockResolvedValue([]);
      vi.mocked(Notification.exists).mockResolvedValue(false);

      const repaired = await NotificationConsistencyService.repairOrphanedConfirmedDeliveries();

      expect(repaired).toBe(1);
      expect(QueueService.enqueue).toHaveBeenCalledWith(
        'pdf-queue-test',
        'pdf:generate',
        expect.objectContaining({
          bookingId: bOrphaned.toString(),
          eventId: eventId.toString(),
        }),
        `pdf:generate:${bOrphaned}`
      );
    });

    it('should respect final just-in-time check to prevent duplicate sends on concurrent completion', async () => {
      const bRace = new Types.ObjectId();
      const candidates = [
        {
          _id: bRace,
          eventId: new Types.ObjectId(),
          guestEmail: 'race@mad.com',
          guestName: 'Race User',
          totalTickets: 1,
        },
      ];

      vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery(candidates) as any);
      vi.mocked(Ticket.aggregate).mockResolvedValue([{ _id: bRace, count: 1 }]);
      vi.mocked(Notification.distinct).mockResolvedValue([]); // Batched check says unsent
      vi.mocked(Notification.exists).mockResolvedValue(true); // JIT check says completed concurrently

      const repaired = await NotificationConsistencyService.repairOrphanedConfirmedDeliveries();

      expect(repaired).toBe(0);
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });
  });
});

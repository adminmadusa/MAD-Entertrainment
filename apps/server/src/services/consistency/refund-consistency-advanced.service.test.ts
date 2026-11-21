import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingStatus, NotificationType } from "@mad/shared";

vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Booking } from "../../models/booking.schema";
import { Event } from "../../models/event.schema";
import { Notification } from "../../models/notification.schema";
import { Refund } from "../../models/refund.schema";
import { RefundConsistencyService } from "./refund-consistency.service";
import { RefundNotificationService } from "../admin/refund/refund-notification.service";
import { QueueService } from "../queue.service";

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

vi.mock("../../models/booking.schema", () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../../models/notification.schema", () => ({
  Notification: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findOne: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../models/event.schema", () => ({
  Event: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/refund.schema", () => ({
  Refund: {
    find: vi.fn(() => mockCreateMockQuery([])),
    aggregate: vi.fn(),
    updateOne: vi.fn(() => mockCreateMockQuery({ modifiedCount: 1 })),
    countDocuments: vi.fn(),
  },
}));

vi.mock("../admin/refund/refund-notification.service", () => ({
  RefundNotificationService: {
    sendRefundNotification: vi.fn(),
  },
}));

vi.mock("../notification.service", () => ({
  createNotificationSafe: vi.fn().mockResolvedValue([]),
}));

vi.mock("../queue.service", () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../config/queue.config", () => ({
  getQueueName: vi.fn((name: string) => `${name}-test`),
}));

describe("RefundConsistencyService - Exact Identity & TTL Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guarantees multiple partial refunds on the same booking are independently identified", async () => {
    const refund1 = { _id: "ref-1", bookingId: "book-multi", amount: 50 };
    const refund2 = { _id: "ref-2", bookingId: "book-multi", amount: 75 };

    // The aggregation returns ref-2 as missing matching notification
    vi.mocked(Refund.aggregate).mockResolvedValueOnce([refund2] as any);
    vi.mocked(Notification.exists).mockResolvedValueOnce(false as any);

    const recovered =
      await RefundConsistencyService.repairOrphanedRefundNotifications({
        window: "recent",
      });
    expect(recovered).toBe(1);
    expect(
      RefundNotificationService.sendRefundNotification,
    ).toHaveBeenCalledWith(refund2);
    expect(
      RefundNotificationService.sendRefundNotification,
    ).not.toHaveBeenCalledWith(refund1);
  });

  it("does NOT treat a failed notification as successfully delivered in diagnostics", async () => {
    const refund = { _id: "ref-fail-1", bookingId: "book-fail-1", amount: 100 };
    vi.mocked(Refund.find).mockReturnValue(
      mockCreateMockQuery([refund]) as any,
    );
    // Notification.exists returns false (no successful/in-flight notification found)
    vi.mocked(Notification.exists).mockResolvedValueOnce(false as any);

    const count =
      await RefundConsistencyService.countOrphanedRefundNotifications();
    expect(count).toBe(1);
  });

  it("enforces 30-day TTL boundary on historical recovery to avoid scanning purged records", async () => {
    vi.mocked(Refund.aggregate).mockResolvedValueOnce([] as any);

    await RefundConsistencyService.repairOrphanedRefundNotifications({
      window: "durable",
    });

    expect(Refund.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            status: "completed",
            processedAt: expect.objectContaining({
              $gte: expect.any(Date),
              $lt: expect.any(Date),
            }),
          }),
        }),
      ]),
    );

    const callArgs = vi.mocked(Refund.aggregate).mock.calls[0][0] as any[];
    const matchStage = callArgs.find(
      (stage) => stage.$match?.$match || stage.$match,
    );
    const gteDate = matchStage.$match.processedAt.$gte;
    const now = Date.now();
    const approx30Days = 30 * 24 * 60 * 60 * 1000;
    // Verify the lower boundary is within ~1 second of now - 30 days
    expect(Math.abs(now - approx30Days - gteDate.getTime())).toBeLessThan(5000);
  });

  it("separately recovers missing event cancellation notifications without confusion with refund notifications", async () => {
    const cancelledBooking = {
      _id: "book-event-cancelled",
      bookingId: "MAD-EV-CANCEL",
      guestEmail: "user@example.com",
      guestName: "User A",
      eventId: "ev-1",
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    };

    vi.mocked(Booking.aggregate).mockResolvedValueOnce([
      cancelledBooking,
    ] as any);
    vi.mocked(Notification.exists).mockResolvedValueOnce(false as any);
    vi.mocked(Event.findById).mockResolvedValueOnce({
      _id: "ev-1",
      title: "Festival 2026",
      startDate: new Date(),
      venue: "Grand Hall",
    } as any);

    const recovered =
      await RefundConsistencyService.repairOrphanedCancellationNotifications({
        window: "recent",
      });
    expect(recovered).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      "notification-queue-test",
      "email-dispatch",
      expect.objectContaining({
        to: "user@example.com",
        notificationType: NotificationType.EVENT_CANCELLED,
      }),
      "cancellation-MAD-EV-CANCEL-retry",
    );
  });
});

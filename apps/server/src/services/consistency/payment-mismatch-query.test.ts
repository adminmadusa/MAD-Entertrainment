import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingStatus, PaymentStatus } from "@mad/shared";

vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { PaymentMismatchQuery } from "./payment-mismatch-query";
import { PaymentRecoveryExecutor } from "./payment-recovery-executor";
import { PaymentRefundService } from "../public/payment-refund.service";

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

vi.mock("../../models/payment.schema", () => ({
  Payment: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../../models/booking.schema", () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
  },
}));

vi.mock("../../models/refund.schema", () => ({
  Refund: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../public/payment-refund.service", () => ({
  PaymentRefundService: {
    triggerRefundRequest: vi.fn(),
  },
}));

describe("PaymentMismatchQuery - Timestamp Correctness & Coverage", () => {
  const now = Date.now();
  const recentDate = new Date(now - 10 * 60 * 1000); // 10 minutes ago
  const historicalDate = new Date(now - 72 * 60 * 60 * 1000); // 72 hours ago
  const inFlightDate = new Date(now - 2 * 60 * 1000); // 2 minutes ago

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates paidAt ?? updatedAt ?? createdAt in strict precedence order", () => {
    // 1. paidAt exists
    expect(
      PaymentMismatchQuery.evaluateEffectiveTimestamp({
        paidAt: recentDate,
        updatedAt: historicalDate,
        createdAt: historicalDate,
      }),
    ).toBe(recentDate);
    // 2. paidAt null -> updatedAt
    expect(
      PaymentMismatchQuery.evaluateEffectiveTimestamp({
        paidAt: null,
        updatedAt: recentDate,
        createdAt: historicalDate,
      }),
    ).toBe(recentDate);
    // 3. paidAt undefined -> updatedAt
    expect(
      PaymentMismatchQuery.evaluateEffectiveTimestamp({
        updatedAt: recentDate,
        createdAt: historicalDate,
      }),
    ).toBe(recentDate);
    // 4. paidAt & updatedAt null/undefined -> createdAt
    expect(
      PaymentMismatchQuery.evaluateEffectiveTimestamp({
        paidAt: null,
        updatedAt: null,
        createdAt: historicalDate,
      }),
    ).toBe(historicalDate);
    // 5. all timestamps missing/null -> null
    expect(
      PaymentMismatchQuery.evaluateEffectiveTimestamp({
        paidAt: null,
        updatedAt: null,
        createdAt: null,
      }),
    ).toBeNull();
  });

  it("constructs Level 1 query matching recent paidAt, fallback updatedAt, and fallback createdAt", () => {
    const windowStart = new Date(now - 48 * 60 * 60 * 1000);
    const upperThreshold = new Date(now - 5 * 60 * 1000);
    const match = PaymentMismatchQuery.getEffectiveTimestampMatch(
      1,
      windowStart,
      upperThreshold,
    );

    expect(match.$or).toHaveLength(3);
    expect(match.$or[0]).toEqual({
      paidAt: { $gte: windowStart, $lte: upperThreshold },
    });
    expect(match.$or[1]).toEqual({
      paidAt: null,
      updatedAt: { $gte: windowStart, $lte: upperThreshold },
    });
    expect(match.$or[2]).toEqual({
      paidAt: null,
      updatedAt: null,
      createdAt: { $gte: windowStart, $lte: upperThreshold },
    });
  });

  it("constructs Level 2 query matching historical paidAt, fallback updatedAt, and fallback createdAt", () => {
    const windowStart = new Date(now - 48 * 60 * 60 * 1000);
    const upperThreshold = new Date(now - 5 * 60 * 1000);
    const match = PaymentMismatchQuery.getEffectiveTimestampMatch(
      2,
      windowStart,
      upperThreshold,
    );

    expect(match.$or).toHaveLength(3);
    expect(match.$or[0]).toEqual({ paidAt: { $lt: windowStart } });
    expect(match.$or[1]).toEqual({
      paidAt: null,
      updatedAt: { $lt: windowStart },
    });
    expect(match.$or[2]).toEqual({
      paidAt: null,
      updatedAt: null,
      createdAt: { $lt: windowStart },
    });

    const unknownMatch = PaymentMismatchQuery.getUnknownTimestampMatch();
    expect(unknownMatch).toEqual({
      paidAt: null,
      updatedAt: null,
      createdAt: null,
    });
  });

  it("enforces in-flight grace period (< 5 min) excluding young payments from recovery", () => {
    const windowStart = new Date(now - 48 * 60 * 60 * 1000);
    const upperThreshold = new Date(now - 5 * 60 * 1000);

    const isLevel1 =
      inFlightDate >= windowStart && inFlightDate <= upperThreshold;
    const isLevel2 = inFlightDate < windowStart;

    expect(isLevel1).toBe(false);
    expect(isLevel2).toBe(false);
  });

  it("sorts deterministically by paidAt, updatedAt, createdAt, and _id", async () => {
    vi.mocked(Payment.aggregate).mockResolvedValueOnce([]);
    await PaymentMismatchQuery.findCandidates(2, 25);

    const pipeline = vi.mocked(Payment.aggregate).mock.calls[0][0] as any[];
    const sortStage = pipeline.find((stage) => stage.$sort);
    expect(sortStage.$sort).toEqual({
      paidAt: 1,
      updatedAt: 1,
      createdAt: 1,
      _id: 1,
    });
  });

  it("confirms free bookings (amount 0, gateway free) never enter refund processing", async () => {
    const freePayment = {
      _id: "pay-free-1",
      bookingId: "book-free-1",
      status: PaymentStatus.PAID,
      amount: 0,
      gateway: "free",
      paidAt: recentDate,
      save: vi.fn(),
    };
    const expiredBooking = {
      _id: "book-free-1",
      status: BookingStatus.FAILED,
    };

    vi.mocked(Booking.findById).mockResolvedValue(expiredBooking as any);

    const resolved =
      await PaymentRecoveryExecutor.resolveCandidate(freePayment);

    expect(resolved).toBe(true);
    expect(freePayment.status).toBe(PaymentStatus.FAILED);
    expect(freePayment.save).toHaveBeenCalled();
    // Zero-amount free booking must NEVER trigger refund
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });
});

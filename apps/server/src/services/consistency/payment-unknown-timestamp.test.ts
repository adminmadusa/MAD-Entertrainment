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
import { PaymentMismatchQuery } from "./payment-mismatch-query";
import { PaymentRecoveryExecutor } from "./payment-recovery-executor";
import { PaymentRefundService } from "../public/payment-refund.service";
import { PaymentService } from "../public/payment.service";

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
    countDocuments: vi.fn(),
  },
}));

vi.mock("../../models/booking.schema", () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock("../public/payment-refund.service", () => ({
  PaymentRefundService: {
    triggerRefundRequest: vi.fn(),
  },
}));

vi.mock("../public/payment.service", () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
  },
}));

describe("Payment Unknown Timestamp Recovery & Grace Period", () => {
  const now = Date.now();
  const recentDate = new Date(now - 10 * 60 * 1000); // 10 minutes ago
  const historicalDate = new Date(now - 72 * 60 * 60 * 1000); // 72 hours ago
  const youngDate = new Date(now - 2 * 60 * 1000); // 2 minutes ago (< 5m)
  const windowStart = new Date(now - 48 * 60 * 60 * 1000);
  const upperThreshold = new Date(now - 5 * 60 * 1000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: All timestamps absent
  it("Case 1: classifies payment with all timestamps absent as UNKNOWN_TIMESTAMP and excludes from L1/L2", () => {
    const doc = {};
    expect(PaymentMismatchQuery.evaluateEffectiveTimestamp(doc)).toBeNull();

    const l1Match = PaymentMismatchQuery.getEffectiveTimestampMatch(
      1,
      windowStart,
      upperThreshold,
    );
    const l2Match = PaymentMismatchQuery.getEffectiveTimestampMatch(
      2,
      windowStart,
      upperThreshold,
    );

    // L1 and L2 queries only match documents that have at least one defined timestamp
    expect(l1Match.$or).toHaveLength(3);
    expect(l2Match.$or).toHaveLength(3);
  });

  // Case 2: All timestamps null
  it("Case 2: classifies payment with all timestamps null as UNKNOWN_TIMESTAMP and excludes from L1/L2", () => {
    const doc = { paidAt: null, updatedAt: null, createdAt: null };
    expect(PaymentMismatchQuery.evaluateEffectiveTimestamp(doc)).toBeNull();
  });

  // Case 3: Missing paidAt with valid updatedAt
  it("Case 3: evaluates effective timestamp using updatedAt when paidAt is null", () => {
    const doc = {
      paidAt: null,
      updatedAt: recentDate,
      createdAt: historicalDate,
    };
    expect(PaymentMismatchQuery.evaluateEffectiveTimestamp(doc)).toBe(
      recentDate,
    );
  });

  // Case 4: Missing paidAt and updatedAt with valid createdAt
  it("Case 4: evaluates effective timestamp using createdAt when paidAt and updatedAt are null", () => {
    const doc = { paidAt: null, updatedAt: null, createdAt: historicalDate };
    expect(PaymentMismatchQuery.evaluateEffectiveTimestamp(doc)).toBe(
      historicalDate,
    );
  });

  // Case 5: Zero-value / free payment never triggers refund
  it("Case 5: never triggers refund request for free or zero-amount payments", async () => {
    const freePayment = {
      _id: "pay-free-unknown",
      bookingId: "book-free-1",
      status: PaymentStatus.PAID,
      amount: 0,
      gateway: "free",
      save: vi.fn(),
    };
    const failedBooking = {
      _id: "book-free-1",
      status: BookingStatus.FAILED,
      createdAt: historicalDate,
    };
    vi.mocked(Booking.findById).mockResolvedValue(failedBooking as any);

    const resolved =
      await PaymentRecoveryExecutor.resolveUnknownTimestampCandidate(
        freePayment,
      );
    expect(resolved).toBe(true);
    expect(freePayment.status).toBe(PaymentStatus.FAILED);
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });

  // Case 6: Unknown timestamp with confirmed booking matching paymentId backfills paidAt safely
  it("Case 6: backfills paidAt safely for confirmed booking without refund or booking mutation", async () => {
    const payment = {
      _id: "pay-confirmed-1",
      bookingId: "book-confirmed-1",
      status: PaymentStatus.PAID,
      amount: 100,
      gateway: "stripe",
      paidAt: null,
      updatedAt: null,
      createdAt: null,
      save: vi.fn(),
    };
    const confirmedBooking = {
      _id: "book-confirmed-1",
      paymentId: "pay-confirmed-1",
      status: BookingStatus.CONFIRMED,
      createdAt: historicalDate,
    };
    vi.mocked(Booking.findById).mockResolvedValue(confirmedBooking as any);

    const resolved = await PaymentRecoveryExecutor.resolveCandidate(payment);
    expect(resolved).toBe(true);
    expect(payment.paidAt).toEqual(historicalDate);
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.save).toHaveBeenCalled();
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });

  // Case 7: Unknown timestamp with young booking (< 5 min) preserves state without mutation
  it("Case 7: preserves state without terminal mutation for young booking under 5-minute grace period", async () => {
    const payment = {
      _id: "pay-young-1",
      bookingId: "book-young-1",
      status: PaymentStatus.PAID,
      amount: 50,
      gateway: "stripe",
      paidAt: null,
      updatedAt: null,
      createdAt: null,
      save: vi.fn(),
    };
    const youngBooking = {
      _id: "book-young-1",
      status: BookingStatus.AWAITING_PAYMENT,
      createdAt: youngDate, // 2 minutes old (< 5m grace period)
    };
    vi.mocked(Booking.findById).mockResolvedValue(youngBooking as any);

    const resolved = await PaymentRecoveryExecutor.resolveCandidate(payment);
    expect(resolved).toBe(false);
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.save).not.toHaveBeenCalled();
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });

  // Boundary verification: Grace period enforcement
  it("Grace Period: recovers payment once booking age exceeds 5-minute threshold", async () => {
    const payment = {
      _id: "pay-mature-1",
      bookingId: "book-mature-1",
      status: PaymentStatus.PAID,
      amount: 50,
      gateway: "stripe",
      paidAt: null,
      updatedAt: null,
      createdAt: null,
      save: vi.fn(),
    };
    const matureBooking = {
      _id: "book-mature-1",
      status: BookingStatus.AWAITING_PAYMENT,
      createdAt: recentDate, // 10 minutes old (> 5m threshold)
    };
    vi.mocked(Booking.findById).mockImplementation((() => ({
      select: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue({ status: BookingStatus.CONFIRMED }),
      })),
      then: vi.fn((resolve) => resolve(matureBooking)),
    })) as any);

    const resolved = await PaymentRecoveryExecutor.resolveCandidate(payment);
    expect(resolved).toBe(true);
    expect(payment.paidAt).toEqual(recentDate);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(
      matureBooking,
      payment,
    );
  });
});

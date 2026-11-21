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
import { PaymentConsistencyService } from "./payment-consistency.service";
import { PaymentFailureTracker } from "./payment-failure-tracker";
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

vi.mock("../../models/booking.schema", () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
  },
}));

vi.mock("../../models/payment.schema", () => ({
  Payment: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../public/payment.service", () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
  },
}));

describe("PaymentConsistencyService - Retry Exhaustion, Exclusion & Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PaymentFailureTracker.clear();
  });

  it("marks a candidate as exhausted after 5 consecutive transient failures", async () => {
    const payment = {
      _id: "pay-flaky-1",
      bookingId: "book-flaky-1",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const booking = {
      _id: "book-flaky-1",
      status: BookingStatus.AWAITING_PAYMENT,
    };

    const transientErr = new Error("MongoNetworkError: connection timed out");
    transientErr.name = "MongoNetworkError";

    vi.mocked(Payment.aggregate).mockResolvedValue([payment] as any);
    vi.mocked(Booking.findById).mockResolvedValue(booking as any);
    vi.mocked(PaymentService.confirmBooking).mockRejectedValue(transientErr);

    // Simulate 5 consecutive failed runs
    for (let i = 0; i < 5; i++) {
      const recovered =
        await PaymentConsistencyService.repairPaidPaymentMismatches({
          level: 2,
        });
      expect(recovered).toBe(0);
    }

    // Candidate should now be exhausted
    expect(PaymentConsistencyService.countExhaustedPaymentRetries()).toBe(1);
    const exhaustedRecords =
      PaymentConsistencyService.getExhaustedPaymentRetries();
    expect(exhaustedRecords).toHaveLength(1);
    expect(exhaustedRecords[0].paymentId).toBe("pay-flaky-1");
    expect(exhaustedRecords[0].consecutiveFailures).toBe(5);
    expect(exhaustedRecords[0].lastFailureReason).toContain(
      "MongoNetworkError",
    );
  });

  it("excludes exhausted candidates from routine batches to prevent queue starvation", async () => {
    // Manually register an exhausted payment
    for (let i = 0; i < 5; i++) {
      PaymentFailureTracker.recordFailure(
        "pay-exhausted",
        "Persistent timeout",
      );
    }
    expect(PaymentFailureTracker.isExhausted("pay-exhausted")).toBe(true);

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([]);

    await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 2 });

    expect(Payment.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = vi.mocked(Payment.aggregate).mock.calls[0][0] as any[];
    const matchStage = pipeline[0].$match;

    // Must exclude the exhausted payment ID from query
    expect(matchStage._id).toEqual({ $nin: ["pay-exhausted"] });
  });

  it("re-enables candidate processing via explicit recovery path retryExhaustedPayments", async () => {
    // Register exhausted candidate
    for (let i = 0; i < 5; i++) {
      PaymentFailureTracker.recordFailure("pay-exhausted", "Temporary outage");
    }
    expect(PaymentConsistencyService.countExhaustedPaymentRetries()).toBe(1);

    const payment = {
      _id: "pay-exhausted",
      bookingId: "book-repaired",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const booking = {
      _id: "book-repaired",
      status: BookingStatus.AWAITING_PAYMENT,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([payment] as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(booking) as any)
      .mockReturnValueOnce(
        mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any,
      );
    vi.mocked(PaymentService.confirmBooking).mockResolvedValueOnce({
      status: BookingStatus.CONFIRMED,
    } as any);

    const recovered =
      await PaymentConsistencyService.retryExhaustedPayments("pay-exhausted");

    expect(recovered).toBe(1);
    expect(PaymentConsistencyService.countExhaustedPaymentRetries()).toBe(0);
    expect(PaymentFailureTracker.isExhausted("pay-exhausted")).toBe(false);
  });

  it("clears from failure tracker when candidate recovers successfully", async () => {
    // Register 2 failures
    PaymentFailureTracker.recordFailure("pay-flaky-2", "Transient timeout 1");
    PaymentFailureTracker.recordFailure("pay-flaky-2", "Transient timeout 2");
    expect(
      PaymentFailureTracker.getFailureRecord("pay-flaky-2")
        ?.consecutiveFailures,
    ).toBe(2);

    const payment = {
      _id: "pay-flaky-2",
      bookingId: "book-success",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const booking = {
      _id: "book-success",
      status: BookingStatus.AWAITING_PAYMENT,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([payment] as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(booking) as any)
      .mockReturnValueOnce(
        mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any,
      );
    vi.mocked(PaymentService.confirmBooking).mockResolvedValueOnce({
      status: BookingStatus.CONFIRMED,
    } as any);

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });

    expect(recovered).toBe(1);
    expect(
      PaymentFailureTracker.getFailureRecord("pay-flaky-2"),
    ).toBeUndefined();
  });
});

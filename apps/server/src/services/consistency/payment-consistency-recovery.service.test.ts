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
import { PaymentService } from "../public/payment.service";
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

vi.mock("../../models/refund.schema", () => ({
  Refund: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../public/payment.service", () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
  },
}));

vi.mock("../public/payment-refund.service", () => ({
  PaymentRefundService: {
    triggerRefundRequest: vi.fn(),
  },
}));

describe("PaymentConsistencyService - Recovery & Transient Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recovers unresolved payments older than 48 hours via Level 2 catch-up", async () => {
    const oldPayment = {
      _id: "pay-old-72h",
      bookingId: "book-old-72h",
      status: PaymentStatus.PAID,
      amount: 150,
      updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      save: vi.fn(),
    };
    const mockBooking = {
      _id: "book-old-72h",
      status: BookingStatus.AWAITING_PAYMENT,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([oldPayment] as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(mockBooking) as any)
      .mockReturnValueOnce(
        mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any,
      );
    vi.mocked(PaymentService.confirmBooking).mockResolvedValueOnce({
      status: BookingStatus.CONFIRMED,
    } as any);

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 2 });
    expect(recovered).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(
      mockBooking,
      oldPayment,
    );
  });

  it("prevents starvation when one candidate throws an unexpected error in a batch", async () => {
    const candidates = [
      {
        _id: "pay-bad-1",
        bookingId: "book-bad-1",
        status: PaymentStatus.PAID,
        amount: 50,
        save: vi.fn(),
      },
      {
        _id: "pay-good-2",
        bookingId: "book-good-2",
        status: PaymentStatus.PAID,
        amount: 100,
        save: vi.fn(),
      },
    ];

    vi.mocked(Payment.aggregate).mockResolvedValueOnce(candidates as any);
    vi.mocked(Booking.findById)
      .mockImplementationOnce(() => {
        throw new Error("Fatal parsing error in candidate 1");
      })
      .mockReturnValueOnce(
        mockCreateMockQuery({
          _id: "book-good-2",
          status: BookingStatus.AWAITING_PAYMENT,
        }) as any,
      )
      .mockReturnValueOnce(
        mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any,
      );

    vi.mocked(PaymentService.confirmBooking).mockResolvedValueOnce({
      status: BookingStatus.CONFIRMED,
    } as any);

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });
    expect(recovered).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledTimes(1);
  });

  it("does NOT mark payment FAILED on transient MongoDB infrastructure network errors", async () => {
    const payment = {
      _id: "pay-transient",
      bookingId: "book-transient",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const booking = {
      _id: "book-transient",
      status: BookingStatus.AWAITING_PAYMENT,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([payment] as any);
    vi.mocked(Booking.findById).mockResolvedValueOnce(booking as any);

    const transientErr = new Error("MongoNetworkError: connection pool closed");
    transientErr.name = "MongoNetworkError";
    vi.mocked(PaymentService.confirmBooking).mockRejectedValueOnce(
      transientErr,
    );

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });
    expect(recovered).toBe(0);
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.save).not.toHaveBeenCalled();
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });

  it("recovers successfully after transient infrastructure error clears", async () => {
    const payment = {
      _id: "pay-cleared",
      bookingId: "book-cleared",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const booking = {
      _id: "book-cleared",
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
    expect(payment.status).toBe(PaymentStatus.PAID);
  });
});

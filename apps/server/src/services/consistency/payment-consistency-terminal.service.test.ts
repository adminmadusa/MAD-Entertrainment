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

describe("PaymentConsistencyService - Terminal States & Duplicate Payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never confirms terminal booking states (CANCELLED / FAILED) and triggers refunds", async () => {
    const payment = {
      _id: "pay-cancelled",
      bookingId: "book-cancelled",
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const cancelledBooking = {
      _id: "book-cancelled",
      status: BookingStatus.CANCELLED,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([payment] as any);
    vi.mocked(Booking.findById).mockResolvedValueOnce(cancelledBooking as any);

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });
    expect(recovered).toBe(1);
    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(payment.failureReason).toBe("BOOKING_UNRECOVERABLE");
    expect(PaymentService.confirmBooking).not.toHaveBeenCalled();
    expect(PaymentRefundService.triggerRefundRequest).toHaveBeenCalledWith(
      cancelledBooking,
      payment,
      "BOOKING_UNRECOVERABLE",
    );
  });

  it("detects duplicate payment on an already confirmed booking and triggers refund", async () => {
    const incomingPayment = {
      _id: "pay-duplicate-incoming",
      bookingId: "book-confirmed-1",
      status: PaymentStatus.PAID,
      amount: 200,
      save: vi.fn(),
    };
    const alreadyConfirmedBooking = {
      _id: "book-confirmed-1",
      status: BookingStatus.CONFIRMED,
      paymentId: "pay-original-winning", // Different winning payment
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([
      incomingPayment,
    ] as any);
    vi.mocked(Booking.findById).mockResolvedValueOnce(
      alreadyConfirmedBooking as any,
    );

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });
    expect(recovered).toBe(1);
    expect(incomingPayment.status).toBe(PaymentStatus.FAILED);
    expect(incomingPayment.failureReason).toBe(
      "DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING",
    );
    expect(PaymentRefundService.triggerRefundRequest).toHaveBeenCalledWith(
      alreadyConfirmedBooking,
      incomingPayment,
      "DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING",
    );
  });

  it("excludes free bookings with zero amount from inappropriate gateway refund requests", async () => {
    const freePayment = {
      _id: "pay-free-0",
      bookingId: "book-free-failed",
      status: PaymentStatus.PAID,
      gateway: "free",
      amount: 0,
      save: vi.fn(),
    };
    const failedFreeBooking = {
      _id: "book-free-failed",
      status: BookingStatus.FAILED,
    };

    vi.mocked(Payment.aggregate).mockResolvedValueOnce([freePayment] as any);
    vi.mocked(Booking.findById).mockResolvedValueOnce(failedFreeBooking as any);

    const recovered =
      await PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 });
    expect(recovered).toBe(1);
    expect(freePayment.status).toBe(PaymentStatus.FAILED);
    expect(PaymentRefundService.triggerRefundRequest).not.toHaveBeenCalled();
  });
});

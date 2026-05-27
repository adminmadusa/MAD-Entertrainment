import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "./payment.service";
import { BookingStatus, PaymentStatus } from "@mad/shared";
import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import crypto from "crypto";

vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_KEY_ID: "test_rzp_key",
    RAZORPAY_KEY_SECRET: "test_rzp_secret",
    STRIPE_PUBLISHABLE_KEY: "test_stripe_key",
    STRIPE_SECRET_KEY: "test_stripe_secret",
  })),
}));

vi.mock("../../config/razorpay", () => ({
  isRazorpayEnabled: vi.fn(() => true),
  getRazorpay: vi.fn(),
}));

vi.mock("../../config/stripe", () => ({
  isStripeEnabled: vi.fn(() => true),
  getStripe: vi.fn(),
}));

vi.mock("../../models/booking.schema", () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../../models/payment.schema", () => ({
  Payment: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../../models/event.schema", () => ({
  Event: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/seat-layout.schema", () => ({
  SeatLayout: {
    updateOne: vi.fn(),
  },
}));

vi.mock("../../config/socket", () => ({
  emitToAdmin: vi.fn(),
  emitToBooking: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../reservation.service", () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    confirmCapacity: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
  },
}));

describe("Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPaymentIntent", () => {
    it("should throw error if booking not found", async () => {
      vi.mocked(Booking.findOne).mockResolvedValue(null);
      await expect(
        PaymentService.createPaymentIntent("fake-id", "stripe"),
      ).rejects.toThrow("Booking not found");
    });

    it("should throw error if booking is not awaiting payment", async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        status: BookingStatus.CONFIRMED,
      } as any);
      await expect(
        PaymentService.createPaymentIntent("fake-id", "stripe"),
      ).rejects.toThrow("cannot accept payment");
    });
  });

  describe("verifyPayment", () => {
    it("should throw error if razorpay signature verification fails", async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: "b-123",
        status: BookingStatus.AWAITING_PAYMENT,
        save: vi.fn(),
      } as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          _id: "p-123",
          gateway: "razorpay",
          status: PaymentStatus.PENDING,
          save: vi.fn(),
        }),
      } as any);

      const payload = {
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "invalid_sig",
      };

      await expect(
        PaymentService.verifyPayment("b-123", payload),
      ).rejects.toThrow("Razorpay signature verification failed");
    });

    it("should verify razorpay payment successfully with valid signature", async () => {
      const mockBooking = {
        _id: "b-123",
        eventId: "e-123",
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        save: vi.fn(),
      };
      const mockPayment = {
        _id: "p-123",
        gateway: "razorpay",
        status: PaymentStatus.PENDING,
        save: vi.fn(),
      };

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockPayment),
      } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      } as any);

      const orderId = "order_123";
      const paymentId = "pay_123";
      const secret = "test_rzp_secret";

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      const payload = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: expectedSignature,
      };

      const result = await PaymentService.verifyPayment("b-123", payload);
      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
    });
  });
});

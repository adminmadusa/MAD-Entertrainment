import { BookingStatus, PaymentStatus } from "@mad/shared";

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { logger } from "../../utils/logger";
import { PaymentRefundService } from "../public/payment-refund.service";
import { PaymentService } from "../public/payment.service";
import { PaymentFailureTracker } from "./payment-failure-tracker";

export class PaymentUnknownRecovery {
  private static readonly GRACE_PERIOD_MS = 5 * 60 * 1000;

  static async resolve(
    paymentDoc: any,
    preloadedBooking?: any,
  ): Promise<boolean> {
    const payment =
      typeof paymentDoc.save === "function"
        ? paymentDoc
        : await Payment.findById(paymentDoc._id);

    if (!payment || payment.status !== PaymentStatus.PAID) return false;

    let booking = preloadedBooking;
    if (!booking && payment.bookingId) {
      try {
        booking = await Booking.findById(payment.bookingId);
      } catch (dbError: any) {
        PaymentFailureTracker.recordFailure(
          payment._id.toString(),
          dbError?.message ||
            "DB error looking up booking for unknown timestamp payment",
        );
        return false;
      }
    }

    // Missing booking: cannot determine age or status; do NOT mutate state
    if (!booking) {
      logger.warn(
        { paymentId: payment._id, bookingId: payment.bookingId },
        "Unknown timestamp payment lacks booking; preserving state without mutation",
      );
      return false;
    }

    const bookingTime = booking.createdAt ?? booking.updatedAt ?? null;
    const isYoung =
      bookingTime &&
      Date.now() - new Date(bookingTime).getTime() < this.GRACE_PERIOD_MS;

    // Case 1: Booking is already CONFIRMED
    if (booking.status === BookingStatus.CONFIRMED) {
      if (
        booking.paymentId &&
        booking.paymentId.toString() === payment._id.toString()
      ) {
        if (bookingTime) {
          payment.paidAt = bookingTime;
          await payment.save();
        }
        PaymentFailureTracker.recordSuccess(payment._id.toString());
        logger.info(
          { paymentId: payment._id, bookingId: booking._id },
          "Safely backfilled paidAt for confirmed booking without refund",
        );
        return true;
      }

      // Duplicate payment on confirmed booking: protect in-flight race condition
      if (isYoung) {
        return false;
      }

      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = "DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING";
      await payment.save();

      if (payment.gateway !== "free" && payment.amount > 0) {
        await PaymentRefundService.triggerRefundRequest(
          booking,
          payment,
          payment.failureReason,
        );
      }
      PaymentFailureTracker.recordSuccess(payment._id.toString());
      return true;
    }

    // Protect in-flight checkouts for young unresolved bookings (< 5m grace period)
    if (isYoung) {
      logger.info(
        { paymentId: payment._id, bookingId: booking._id },
        "Unknown timestamp payment within 5m grace period; skipping mutation",
      );
      return false;
    }

    // Case 2: Booking is FAILED or CANCELLED
    if (
      booking.status === BookingStatus.FAILED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = "BOOKING_UNRECOVERABLE";
      await payment.save();

      if (payment.gateway !== "free" && payment.amount > 0) {
        await PaymentRefundService.triggerRefundRequest(
          booking,
          payment,
          "BOOKING_UNRECOVERABLE",
        );
      }
      PaymentFailureTracker.recordSuccess(payment._id.toString());
      return true;
    }

    // Case 3: Booking is AWAITING_PAYMENT, EXPIRING, or EXPIRED
    if (
      [
        BookingStatus.AWAITING_PAYMENT,
        BookingStatus.EXPIRING,
        BookingStatus.EXPIRED,
      ].includes(booking.status)
    ) {
      try {
        await (PaymentService as any).confirmBooking(booking, payment);
        const updatedBooking = await Booking.findById(booking._id)
          .select("status")
          .lean();

        if (updatedBooking?.status === BookingStatus.CONFIRMED) {
          if (bookingTime) {
            payment.paidAt = bookingTime;
            await payment.save();
          }
          PaymentFailureTracker.recordSuccess(payment._id.toString());
          return true;
        }

        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason =
          payment.failureReason || "LATE_PAYMENT_RECOVERY_REJECTED";
        await payment.save();

        if (payment.gateway !== "free" && payment.amount > 0) {
          await PaymentRefundService.triggerRefundRequest(
            booking,
            payment,
            payment.failureReason,
          );
        }
        PaymentFailureTracker.recordSuccess(payment._id.toString());
        return true;
      } catch (err: any) {
        const isTransient =
          err.name === "MongoNetworkError" ||
          err.name === "MongoServerSelectionError" ||
          err.message?.includes("buffering timed out") ||
          err.message?.includes("connection");

        if (isTransient) {
          PaymentFailureTracker.recordFailure(
            payment._id.toString(),
            err?.message || "Transient DB error during unknown recovery",
          );
          return false;
        }

        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = err.message || "LATE_PAYMENT_RECOVERY_ERROR";
        await payment.save();

        if (payment.gateway !== "free" && payment.amount > 0) {
          await PaymentRefundService.triggerRefundRequest(
            booking,
            payment,
            payment.failureReason,
          );
        }
        PaymentFailureTracker.recordSuccess(payment._id.toString());
        return true;
      }
    }

    return false;
  }
}

import { BookingStatus, PaymentStatus } from "@mad/shared";

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { Refund } from "../../models/refund.schema";
import { logger } from "../../utils/logger";
import { PaymentRefundService } from "../public/payment-refund.service";
import { PaymentService } from "../public/payment.service";
import { PaymentFailureTracker } from "./payment-failure-tracker";
import { PaymentMismatchQuery } from "./payment-mismatch-query";
import { PaymentUnknownRecovery } from "./payment-unknown-recovery";

export class PaymentRecoveryExecutor {
  static async resolveCandidate(paymentDoc: any): Promise<boolean> {
    const payment =
      typeof paymentDoc.save === "function"
        ? paymentDoc
        : await Payment.findById(paymentDoc._id);
    if (!payment || payment.status !== PaymentStatus.PAID) return false;

    let booking: any = null;
    try {
      booking = await Booking.findById(payment.bookingId);
    } catch (dbError: any) {
      PaymentFailureTracker.recordFailure(
        payment._id.toString(),
        dbError?.message || "Transient DB error looking up booking",
      );
      logger.warn(
        { paymentId: payment._id, error: dbError },
        "Transient DB error looking up booking; skipping without failing payment",
      );
      return false;
    }

    if (PaymentMismatchQuery.evaluateEffectiveTimestamp(payment) === null) {
      return await PaymentUnknownRecovery.resolve(payment, booking);
    }

    // Case C: Booking already FAILED, CANCELLED, or missing
    if (
      !booking ||
      booking.status === BookingStatus.FAILED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      logger.warn(
        {
          paymentId: payment._id,
          bookingId: payment.bookingId,
          bookingStatus: booking?.status,
        },
        "Watchdog: Booking missing/unrecoverable. Failing payment and triggering refund.",
      );
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = "BOOKING_UNRECOVERABLE";
      await payment.save();

      if (booking) {
        if (payment.gateway !== "free" && payment.amount > 0) {
          await PaymentRefundService.triggerRefundRequest(
            booking,
            payment,
            "BOOKING_UNRECOVERABLE",
          );
        }
      } else if (payment.amount > 0) {
        const idempotencyKey = `auto-refund-${payment._id}`;
        const existingRefund = await Refund.findOne({
          paymentId: payment._id,
          status: { $in: ["requested", "processing", "completed"] },
        });
        if (!existingRefund) {
          await Refund.create([
            {
              bookingId: payment.bookingId,
              paymentId: payment._id,
              amount: payment.amount,
              currency: payment.currency || "USD",
              reason: "BOOKING_UNRECOVERABLE",
              status: "requested",
              idempotencyKey,
            },
          ]);
        }
      }
      PaymentFailureTracker.recordSuccess(payment._id.toString());
      return true;
    }

    // Case B: Already confirmed booking check
    if (booking.status === BookingStatus.CONFIRMED) {
      if (
        booking.paymentId &&
        booking.paymentId.toString() !== payment._id.toString()
      ) {
        logger.warn(
          {
            bookingId: booking._id,
            paymentId: payment._id,
            existingPaymentId: booking.paymentId,
          },
          "Watchdog: Duplicate payment on confirmed booking. Failing duplicate payment and refunding.",
        );
        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = "DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING";
        await payment.save();
        if (payment.gateway !== "free" && payment.amount > 0) {
          await PaymentRefundService.triggerRefundRequest(
            booking,
            payment,
            "DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING",
          );
        }
        PaymentFailureTracker.recordSuccess(payment._id.toString());
        return true;
      }
      return false;
    }

    // Case A: Booking status is AWAITING_PAYMENT, EXPIRING, EXPIRED
    if (
      [
        BookingStatus.AWAITING_PAYMENT,
        BookingStatus.EXPIRING,
        BookingStatus.EXPIRED,
      ].includes(booking.status)
    ) {
      logger.info(
        {
          paymentId: payment._id,
          bookingId: booking._id,
          bookingStatus: booking.status,
        },
        "Watchdog: Attempting recovery for paid payment with unconfirmed booking.",
      );
      try {
        await (PaymentService as any).confirmBooking(booking, payment);
        const updatedBooking = await Booking.findById(booking._id)
          .select("status")
          .lean();
        if (updatedBooking?.status === BookingStatus.CONFIRMED) {
          logger.info(
            { paymentId: payment._id, bookingId: booking._id },
            "Watchdog: Successfully recovered booking to CONFIRMED status.",
          );
          PaymentFailureTracker.recordSuccess(payment._id.toString());
          return true;
        } else {
          logger.warn(
            { paymentId: payment._id, bookingId: booking._id },
            "Watchdog: Confirmation rejected or capacity unavailable. Failing payment and refunding.",
          );
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
        }
      } catch (confirmError: any) {
        const isTransient =
          confirmError.name === "MongoNetworkError" ||
          confirmError.name === "MongoServerSelectionError" ||
          confirmError.message?.includes("buffering timed out") ||
          confirmError.message?.includes("connection");
        if (isTransient) {
          PaymentFailureTracker.recordFailure(
            payment._id.toString(),
            confirmError?.message ||
              "Transient infrastructure error during confirmBooking",
          );
          logger.error(
            {
              paymentId: payment._id,
              bookingId: booking._id,
              error: confirmError,
            },
            "Watchdog: Transient infrastructure error during confirmBooking; retrying next cycle without failing payment.",
          );
          return false;
        }
        logger.error(
          {
            paymentId: payment._id,
            bookingId: booking._id,
            error: confirmError,
          },
          "Watchdog: Domain error during booking confirmation recovery. Failing payment and triggering refund.",
        );
        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason =
          confirmError.message || "LATE_PAYMENT_RECOVERY_ERROR";
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

  static async resolveUnknownTimestampCandidate(
    paymentDoc: any,
  ): Promise<boolean> {
    return await PaymentUnknownRecovery.resolve(paymentDoc);
  }
}

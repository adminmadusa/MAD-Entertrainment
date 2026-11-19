import { BookingStatus, PaymentStatus } from "@mad/shared";

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { logger } from "../../utils/logger";

export class PaymentMismatchQuery {
  static async countPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000);

    if (typeof Payment.aggregate === "function") {
      try {
        const results = await Payment.aggregate([
          {
            $match: {
              status: PaymentStatus.PAID,
              updatedAt: { $gte: windowStart, $lte: recoveryThreshold },
            },
          },
          {
            $lookup: {
              from: "bookings",
              localField: "bookingId",
              foreignField: "_id",
              as: "booking",
            },
          },
          {
            $match: {
              $or: [
                { "booking.0": { $exists: false } },
                { "booking.0.status": { $ne: BookingStatus.CONFIRMED } },
              ],
            },
          },
          { $count: "total" },
        ]);
        return results[0]?.total ?? 0;
      } catch (err) {
        logger.warn(
          { err },
          "Aggregation count failed, falling back to query scan",
        );
      }
    }

    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold },
    })
      .select("bookingId")
      .lean();

    let count = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId)
          .select("status")
          .lean();
        if (!booking || booking.status !== BookingStatus.CONFIRMED) count++;
      } catch (error) {
        logger.warn(
          { paymentId: payment._id, error },
          "watchdog: failed to count paid payment mismatch",
        );
      }
    }
    return count;
  }

  static async findCandidates(level: 1 | 2, limit: number): Promise<any[]> {
    const now = Date.now();
    const upperThreshold = new Date(now - 5 * 60 * 1000);
    const windowStart = new Date(now - 48 * 60 * 60 * 1000);

    let candidatePayments: any[] = [];
    if (typeof Payment.aggregate === "function") {
      const matchFilter: any = { status: PaymentStatus.PAID };
      if (level === 2) matchFilter.updatedAt = { $lt: windowStart };
      else matchFilter.updatedAt = { $gte: windowStart, $lte: upperThreshold };

      try {
        candidatePayments = await Payment.aggregate([
          { $match: matchFilter },
          {
            $lookup: {
              from: "bookings",
              localField: "bookingId",
              foreignField: "_id",
              as: "booking",
            },
          },
          {
            $match: {
              $or: [
                { "booking.0": { $exists: false } },
                { "booking.0.status": { $ne: BookingStatus.CONFIRMED } },
              ],
            },
          },
          { $sort: { updatedAt: 1, _id: 1 } },
          { $limit: limit },
        ]);
      } catch (aggErr) {
        logger.warn(
          { aggErr },
          "Payment consistency aggregation lookup failed, falling back to find",
        );
      }
    }

    if (!candidatePayments || candidatePayments.length === 0) {
      const findQuery: any = { status: PaymentStatus.PAID };
      if (level === 2) findQuery.updatedAt = { $lt: windowStart };
      else findQuery.updatedAt = { $lte: upperThreshold };
      candidatePayments = await Payment.find(findQuery)
        .sort({ updatedAt: 1, _id: 1 })
        .limit(limit);
    }

    return candidatePayments;
  }
}

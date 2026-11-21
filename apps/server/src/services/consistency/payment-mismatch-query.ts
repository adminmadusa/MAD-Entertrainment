import { BookingStatus, PaymentStatus } from "@mad/shared";

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { logger } from "../../utils/logger";

export interface CandidateQueryOptions {
  excludeIds?: string[];
}

export class PaymentMismatchQuery {
  static evaluateEffectiveTimestamp(doc: {
    paidAt?: Date | null;
    updatedAt?: Date | null;
    createdAt?: Date | null;
  }): Date | null {
    return doc.paidAt ?? doc.updatedAt ?? doc.createdAt ?? null;
  }

  static getEffectiveTimestampMatch(
    level: 1 | 2,
    windowStart: Date,
    upperThreshold: Date,
  ): any {
    if (level === 1) {
      return {
        $or: [
          // 1. paidAt exists and is in recent window
          { paidAt: { $gte: windowStart, $lte: upperThreshold } },
          // 2. paidAt is null/missing, updatedAt is in recent window
          {
            paidAt: null,
            updatedAt: { $gte: windowStart, $lte: upperThreshold },
          },
          // 3. paidAt and updatedAt are null/missing, createdAt is in recent window
          {
            paidAt: null,
            updatedAt: null,
            createdAt: { $gte: windowStart, $lte: upperThreshold },
          },
        ],
      };
    }
    return {
      $or: [
        // 1. paidAt is historical (< 48h)
        { paidAt: { $lt: windowStart } },
        // 2. paidAt is null/missing, updatedAt is historical (< 48h)
        { paidAt: null, updatedAt: { $lt: windowStart } },
        // 3. paidAt and updatedAt are null/missing, createdAt is historical (< 48h)
        { paidAt: null, updatedAt: null, createdAt: { $lt: windowStart } },
      ],
    };
  }

  static getUnknownTimestampMatch(): any {
    return {
      paidAt: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  static async countUnknownTimestampPayments(): Promise<number> {
    try {
      if (typeof Payment.countDocuments === "function") {
        return await Payment.countDocuments({
          status: PaymentStatus.PAID,
          ...this.getUnknownTimestampMatch(),
        });
      }
      const candidates = await Payment.find({
        status: PaymentStatus.PAID,
        ...this.getUnknownTimestampMatch(),
      })
        .select("_id")
        .lean();
      return candidates.length;
    } catch (err) {
      logger.warn({ err }, "Failed to count unknown timestamp payments");
      return 0;
    }
  }

  static async findUnknownTimestampCandidates(limit = 50): Promise<any[]> {
    return await Payment.find({
      status: PaymentStatus.PAID,
      ...this.getUnknownTimestampMatch(),
    })
      .sort({ _id: 1 })
      .limit(limit);
  }

  static async countPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const timeMatch = this.getEffectiveTimestampMatch(
      1,
      windowStart,
      recoveryThreshold,
    );

    if (typeof Payment.aggregate === "function") {
      try {
        const results = await Payment.aggregate([
          { $match: { status: PaymentStatus.PAID, ...timeMatch } },
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
      ...timeMatch,
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

  static async findCandidates(
    level: 1 | 2,
    limit: number,
    options: CandidateQueryOptions = {},
  ): Promise<any[]> {
    const now = Date.now();
    const upperThreshold = new Date(now - 5 * 60 * 1000);
    const windowStart = new Date(now - 48 * 60 * 60 * 1000);
    const timeMatch = this.getEffectiveTimestampMatch(
      level,
      windowStart,
      upperThreshold,
    );

    const matchFilter: any = {
      status: PaymentStatus.PAID,
      ...timeMatch,
    };

    if (options.excludeIds && options.excludeIds.length > 0) {
      matchFilter._id = { $nin: options.excludeIds };
    }

    let candidatePayments: any[] = [];
    if (typeof Payment.aggregate === "function") {
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
          { $sort: { paidAt: 1, updatedAt: 1, createdAt: 1, _id: 1 } },
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
      candidatePayments = await Payment.find(matchFilter)
        .sort({ paidAt: 1, updatedAt: 1, createdAt: 1, _id: 1 })
        .limit(limit);
    }

    return candidatePayments;
  }
}

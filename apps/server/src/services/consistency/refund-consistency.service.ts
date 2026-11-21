import { NotificationType } from "@mad/shared";

import { Notification } from "../../models/notification.schema";
import { Refund } from "../../models/refund.schema";
import { auditLog } from "../../utils/audit";
import { logger } from "../../utils/logger";
import { RefundNotificationService } from "../admin/refund/refund-notification.service";
import {
  CancellationConsistencyService,
  CancellationRepairOptions,
} from "./cancellation-consistency.service";

export type RefundRepairOptions = CancellationRepairOptions;

export class RefundConsistencyService {
  static async countStuckProcessingRefunds(): Promise<number> {
    return await Refund.countDocuments({
      status: "processing",
      updatedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) },
    });
  }

  static async countOrphanedRefundNotifications(): Promise<number> {
    const upper = new Date(Date.now() - 10 * 60 * 1000);
    const lower = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30d TTL boundary
    const completedRefunds = await Refund.find({
      status: "completed",
      processedAt: { $gte: lower, $lte: upper },
    })
      .select("_id bookingId")
      .lean();

    let count = 0;
    for (const refund of completedRefunds) {
      const hasNotification = await Notification.exists({
        bookingId: refund.bookingId,
        jobId: { $regex: `^refund-${refund._id}` },
      });
      if (!hasNotification) count++;
    }
    return count;
  }

  static async countOrphanedCancellationNotifications(): Promise<number> {
    return await CancellationConsistencyService.countOrphanedCancellationNotifications();
  }

  static async repairStuckProcessingRefunds(): Promise<number> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000);
    const stuckRefunds = await Refund.find({
      status: "processing",
      updatedAt: { $lte: threshold },
    }).limit(100);

    let resetCount = 0;
    for (const refund of stuckRefunds) {
      try {
        const updateResult = await Refund.updateOne(
          { _id: refund._id, status: "processing" },
          { $set: { status: "requested" } },
        );
        if (updateResult.modifiedCount > 0) {
          resetCount++;
          auditLog({
            action: "REFUND_PROCESSING_TIMEOUT_RESET",
            actor: { type: "admin", id: "system" },
            status: "success",
            metadata: {
              refundId: refund._id.toString(),
              paymentId: refund.paymentId.toString(),
              bookingId: refund.bookingId.toString(),
              amount: refund.amount,
            },
            description: `Reset stuck processing refund ${refund._id} back to requested due to 15-minute lease expiry.`,
          });
          logger.warn(
            { refundId: refund._id },
            "Watchdog: Reverted stuck processing refund back to requested status.",
          );
        }
      } catch (error) {
        logger.error(
          { refundId: refund._id, error },
          "Watchdog: Failed to reset stuck processing refund.",
        );
      }
    }
    return resetCount;
  }

  static async repairOrphanedRefundNotifications(
    options: RefundRepairOptions = {},
  ): Promise<number> {
    const window = options.window || "recent";
    const limit = options.limit || 50;
    const now = Date.now();
    const upper = new Date(now - 10 * 60 * 1000);
    const windowStart48h = new Date(now - 48 * 60 * 60 * 1000);
    const ttlBoundary30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const matchQuery: any = { status: "completed" };
    if (window === "durable")
      matchQuery.processedAt = { $gte: ttlBoundary30d, $lt: windowStart48h };
    else if (window === "all")
      matchQuery.processedAt = { $gte: ttlBoundary30d, $lte: upper };
    else matchQuery.processedAt = { $gte: windowStart48h, $lte: upper };

    let completedRefunds: any[] = [];
    if (typeof Refund.aggregate === "function") {
      try {
        completedRefunds = await Refund.aggregate([
          { $match: matchQuery },
          {
            $lookup: {
              from: "notifications",
              let: {
                bookingId: "$bookingId",
                refundPrefix: { $concat: ["refund-", { $toString: "$_id" }] },
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$bookingId", "$$bookingId"] },
                        {
                          $in: [
                            "$type",
                            [
                              NotificationType.FULL_REFUND,
                              NotificationType.PARTIAL_REFUND,
                            ],
                          ],
                        },
                        {
                          $eq: [
                            { $indexOfCP: ["$jobId", "$$refundPrefix"] },
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "matchingNotifications",
            },
          },
          { $match: { "matchingNotifications.0": { $exists: false } } },
          { $sort: { processedAt: 1, _id: 1 } },
          { $limit: limit },
        ]);
      } catch (aggErr) {
        logger.warn(
          { aggErr },
          "Refund aggregation lookup failed, falling back to find",
        );
      }
    }

    if (!completedRefunds || completedRefunds.length === 0) {
      completedRefunds = await Refund.find(matchQuery)
        .sort({ processedAt: 1, _id: 1 })
        .limit(limit);
    }

    let recoveredCount = 0;
    for (const refund of completedRefunds) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: refund.bookingId,
          jobId: { $regex: `^refund-${refund._id}` },
        });
        if (hasNotification) continue;

        await RefundNotificationService.sendRefundNotification(refund);
        recoveredCount++;
        logger.info(
          { refundId: refund._id },
          "Watchdog successfully recovered and enqueued orphaned refund notification.",
        );
      } catch (error) {
        logger.error(
          { refundId: refund._id, error },
          "Watchdog: Failed to repair orphaned refund notification.",
        );
      }
    }
    return recoveredCount;
  }

  static async repairOrphanedCancellationNotifications(
    options: RefundRepairOptions = {},
  ): Promise<number> {
    return await CancellationConsistencyService.repairOrphanedCancellationNotifications(
      options,
    );
  }
}

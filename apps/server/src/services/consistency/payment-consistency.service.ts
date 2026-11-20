import { logger } from "../../utils/logger";
import {
  PaymentFailureRecord,
  PaymentFailureTracker,
} from "./payment-failure-tracker";
import { PaymentMismatchQuery } from "./payment-mismatch-query";
import { PaymentRecoveryExecutor } from "./payment-recovery-executor";

export interface PaymentRepairOptions {
  level?: 1 | 2;
  limit?: number;
  excludeExhausted?: boolean;
  resetExhausted?: boolean;
}

export class PaymentConsistencyService {
  static async countPaidPaymentMismatches(): Promise<number> {
    return await PaymentMismatchQuery.countPaidPaymentMismatches();
  }

  static async countUnknownTimestampPayments(): Promise<number> {
    return await PaymentMismatchQuery.countUnknownTimestampPayments();
  }

  static async repairUnknownTimestampPayments(limit = 50): Promise<number> {
    const candidates =
      await PaymentMismatchQuery.findUnknownTimestampCandidates(limit);
    let successCount = 0;
    for (const paymentDoc of candidates) {
      try {
        const resolved =
          await PaymentRecoveryExecutor.resolveUnknownTimestampCandidate(
            paymentDoc,
          );
        if (resolved) successCount++;
      } catch (error: any) {
        logger.error(
          { paymentId: paymentDoc._id, error },
          "Failed to process unknown timestamp payment",
        );
      }
    }
    return successCount;
  }

  static countExhaustedPaymentRetries(): number {
    return PaymentFailureTracker.getExhaustedCount();
  }

  static getExhaustedPaymentRetries(): PaymentFailureRecord[] {
    return PaymentFailureTracker.getExhaustedRecords();
  }

  static resetExhaustedRetries(paymentId?: string): void {
    PaymentFailureTracker.resetExhausted(paymentId);
  }

  static async retryExhaustedPayments(paymentId?: string): Promise<number> {
    PaymentFailureTracker.resetExhausted(paymentId);
    return await this.repairPaidPaymentMismatches({
      level: 2,
      excludeExhausted: false,
    });
  }

  static async repairPaidPaymentMismatches(
    options: PaymentRepairOptions = {},
  ): Promise<number> {
    const level = options.level ?? 1;
    const limit = options.limit ?? 50;

    if (options.resetExhausted) {
      PaymentFailureTracker.resetExhausted();
    }

    const excludeIds =
      options.excludeExhausted === false
        ? []
        : PaymentFailureTracker.getExhaustedIds();

    const candidatePayments = await PaymentMismatchQuery.findCandidates(
      level,
      limit,
      { excludeIds },
    );

    let successCount = 0;
    for (const paymentDoc of candidatePayments) {
      try {
        const resolved =
          await PaymentRecoveryExecutor.resolveCandidate(paymentDoc);
        if (resolved) {
          successCount++;
        }
      } catch (error: any) {
        PaymentFailureTracker.recordFailure(
          paymentDoc._id?.toString() || "unknown",
          error?.message || "Unexpected exception during repair",
        );
        logger.error(
          { paymentId: paymentDoc._id, error },
          "Watchdog: Failed to process paid payment mismatch",
        );
      }
    }
    return successCount;
  }
}

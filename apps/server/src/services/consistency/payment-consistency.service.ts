import { logger } from "../../utils/logger";
import { PaymentMismatchQuery } from "./payment-mismatch-query";
import { PaymentRecoveryExecutor } from "./payment-recovery-executor";

export interface PaymentRepairOptions {
  level?: 1 | 2;
  limit?: number;
}

export class PaymentConsistencyService {
  static async countPaidPaymentMismatches(): Promise<number> {
    return await PaymentMismatchQuery.countPaidPaymentMismatches();
  }

  static async repairPaidPaymentMismatches(
    options: PaymentRepairOptions = {},
  ): Promise<number> {
    const level = options.level ?? 1;
    const limit = options.limit ?? 50;

    const candidatePayments = await PaymentMismatchQuery.findCandidates(
      level,
      limit,
    );

    let successCount = 0;
    for (const paymentDoc of candidatePayments) {
      try {
        const resolved =
          await PaymentRecoveryExecutor.resolveCandidate(paymentDoc);
        if (resolved) {
          successCount++;
        }
      } catch (error) {
        logger.error(
          { paymentId: paymentDoc._id, error },
          "Watchdog: Failed to process paid payment mismatch",
        );
      }
    }
    return successCount;
  }
}

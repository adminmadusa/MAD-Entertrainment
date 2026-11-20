/**
 * PaymentFailureTracker provides in-memory failure tracking and starvation
 * protection for payment mismatch reconciliation.
 *
 * DEPLOYMENT TOPOLOGY & LIFECYCLE NOTES:
 * 1. Storage: In-memory (Map). Bounded per Node process. Resets on restart.
 * 2. Concurrency: BullMQ job locks guarantee single-worker processing per cycle.
 * 3. Multi-instance: Each worker instance maintains its own transient failure
 *    circuit breaker. Database transactions & idempotency keys ensure safety.
 * 4. Persistence: External persistence (Redis/DB) is intentionally deferred to
 *    avoid unnecessary external dependencies until explicitly approved.
 */
export interface PaymentFailureRecord {
  paymentId: string;
  consecutiveFailures: number;
  lastFailureReason: string;
  lastAttemptedAt: Date;
  exhausted: boolean;
}

export class PaymentFailureTracker {
  private static failures = new Map<string, PaymentFailureRecord>();
  public static readonly MAX_CONSECUTIVE_FAILURES = 5;

  static recordFailure(paymentId: string, reason: string): void {
    const existing = this.failures.get(paymentId);
    const count = (existing?.consecutiveFailures ?? 0) + 1;
    this.failures.set(paymentId, {
      paymentId,
      consecutiveFailures: count,
      lastFailureReason: reason,
      lastAttemptedAt: new Date(),
      exhausted: count >= this.MAX_CONSECUTIVE_FAILURES,
    });
  }

  static recordSuccess(paymentId: string): void {
    this.failures.delete(paymentId);
  }

  static isExhausted(paymentId: string): boolean {
    return this.failures.get(paymentId)?.exhausted ?? false;
  }

  static getExhaustedCount(): number {
    let count = 0;
    for (const record of this.failures.values()) {
      if (record.exhausted) count++;
    }
    return count;
  }

  static getExhaustedRecords(): PaymentFailureRecord[] {
    const list: PaymentFailureRecord[] = [];
    for (const record of this.failures.values()) {
      if (record.exhausted) list.push({ ...record });
    }
    return list;
  }

  static getExhaustedIds(): string[] {
    const ids: string[] = [];
    for (const record of this.failures.values()) {
      if (record.exhausted) ids.push(record.paymentId);
    }
    return ids;
  }

  static getFailureRecord(paymentId: string): PaymentFailureRecord | undefined {
    return this.failures.get(paymentId);
  }

  static resetExhausted(paymentId?: string): void {
    if (paymentId) {
      this.failures.delete(paymentId);
    } else {
      this.failures.clear();
    }
  }

  static clear(): void {
    this.failures.clear();
  }
}

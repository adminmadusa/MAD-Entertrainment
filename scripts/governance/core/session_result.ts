// scripts/governance/core/session_result.ts

/**
 * Statistics and execution outcomes of a completed or cancelled Auto-Fix session.
 * Consumed by CLI reporters to print summaries.
 */
export interface SessionResult {
  sessionId: string;
  executionMode: string;
  approvedCount: number;
  appliedCount: number;
  skippedCount: number;
  verificationPassed: boolean;
  rollbackId?: string;
  elapsedMs: number;
  completed: boolean;
  cancelled: boolean;
}

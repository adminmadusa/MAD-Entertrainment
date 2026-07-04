// scripts/governance/core/interactive_result.ts

/**
 * Result returned by InteractiveApprovalPolicy after the prompt loop completes.
 * Consumed only by cli/fix.ts for CLI reporting.
 * Has no dependency on FixResult, ApprovalPlan, or lifecycle components.
 */
export interface InteractiveResult {
  /** Number of violations explicitly approved by the user. */
  approvedCount: number;
  /** Number of violations explicitly skipped or never reached (quit/skip-remaining). */
  skippedCount: number;
  /** True if the user quit the session without applying any fixes. */
  cancelled: boolean;
  /** Wall-clock time the prompt loop took in milliseconds. */
  elapsedMs: number;
}

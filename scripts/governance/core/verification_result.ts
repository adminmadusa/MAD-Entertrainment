// scripts/governance/core/verification_result.ts

/**
 * The outcome of a single finding's verification scan.
 * A finding is "passed" when the violation is absent from the re-scan.
 */
export interface VerifiedFinding {
  /** Stable finding ID (f_<sha256 prefix>) */
  findingId: string;
  /** Rule ID that generated the finding (e.g. VAL-HYG-004) */
  ruleId: string;
  /** Workspace-relative file path that was verified */
  filePath: string;
  /** true = violation gone (fix succeeded); false = violation still present (fix failed) */
  verificationPassed: boolean;
}

/**
 * Aggregated result of the post-fix or post-rollback verification pass.
 * Returned by FixLifecycleIntegrator and consumed only by CLI reporting.
 * Has no dependency on FixResult.
 */
export interface VerificationResult {
  /** Per-finding verification outcomes */
  verifiedFindings: VerifiedFinding[];
  /** Count of findings where violation was confirmed absent */
  verificationPassed: number;
  /** Count of findings where violation was still present after fix */
  verificationFailed: number;
  /** Count of findings transitioned to CLOSED by this run */
  findingsClosed: number;
  /** Count of findings reopened as REGRESSION by this run */
  findingsReopened: number;
  /** Wall-clock time of the verification pass in milliseconds */
  elapsedMs: number;
}

// scripts/governance/core/lifecycle_manager.ts
import { FindingManager } from './finding_manager';
import { Finding, FindingStatus } from './types';

export class LifecycleManager {
  private findingManager: FindingManager;

  constructor(findingManager: FindingManager) {
    this.findingManager = findingManager;
  }

  public getFindingManager(): FindingManager {
    return this.findingManager;
  }

  /**
   * Evaluates and updates the state of all findings based on the active scan violations list.
   * @param detectedFindingIds Set of finding IDs that were detected in the current scan.
   * @param options Incremental scanning option controls.
   */
  public reconcile(
    detectedFindingIds: Set<string>,
    options: { isIncremental?: boolean; scannedFiles?: string[] } = {}
  ) {
    const allFindings = this.findingManager.getAllFindings();
    const scannedSet = new Set(options.scannedFiles || []);

    for (const finding of allFindings) {
      const isDetected = detectedFindingIds.has(finding.id);
      const currentStatus = finding.status;

      if (isDetected) {
        // --- CASE 1: Finding is active/detected in current scan ---

        if (currentStatus === 'CLOSED' || currentStatus === 'VERIFIED') {
          // Regression: Finding was previously closed or verified, but is now detected again
          this.updateFindingStatus(finding, 'REGRESSION', 'DETECTED_AGAIN', 'Finding regressed. Code violation re-introduced.');
        } else if (currentStatus === 'FALSE_POSITIVE' || currentStatus === 'IGNORED') {
          // Validate exception validity
          const exception = this.findingManager.getException(finding.id);
          if (!exception) {
            // Exception is missing or expired, revert to NEW
            this.updateFindingStatus(finding, 'NEW', 'EXCEPTION_EXPIRED', 'Exception expired or not found. Re-evaluating finding.');
          }
        }
      } else {
        // --- CASE 2: Finding was NOT detected in current scan ---

        // In incremental mode, only resolve/close findings if their file path was actually scanned in the run
        if (options.isIncremental && !scannedSet.has(finding.evidence.path)) {
          continue;
        }

        if (
          currentStatus === 'NEW' ||
          currentStatus === 'CONFIRMED' ||
          currentStatus === 'REGRESSION'
        ) {
          // Resolution: The code violation has been resolved/fixed
          this.updateFindingStatus(finding, 'CLOSED', 'RESOLVED', 'Code violation no longer detected. Marking finding as closed.');
        }
      }
    }
  }

  /**
   * Publicly transitions a finding to a new status and appends a history event.
   * This is the single authoritative mutation point for all lifecycle transitions.
   * Use this instead of mutating finding.status directly anywhere in the codebase.
   */
  public transitionFinding(
    finding: Finding,
    newStatus: FindingStatus,
    action: string,
    notes: string
  ) {
    this.updateFindingStatus(finding, newStatus, action, notes);
  }

  /**
   * Performs a targeted lifecycle reconciliation scoped to a specific set of files.
   *
   * Used by FixLifecycleIntegrator after a fix or rollback to update only the
   * findings whose files were actually touched — without running a full audit.
   *
   * Applies the same close/regression/confirm logic as reconcile() but:
   * - Only considers findings whose evidence.path is in `scannedFiles`.
   * - Uses the pre-computed `detectedRuleFilePairs` set (from VerificationRunner)
   *   instead of re-running detection itself.
   *
   * @param detectedRuleFilePairs - Set of `${ruleId}:${filePath}` strings still
   *   present after the fix scan.
   * @param scannedFiles - Workspace-relative paths of files that were re-scanned.
   * @returns Summary counts of transitions performed.
   */
  public reconcileTargeted(
    detectedRuleFilePairs: Set<string>,
    scannedFiles: string[]
  ): { closed: string[]; confirmed: string[]; reopened: string[] } {
    const scannedSet = new Set(scannedFiles);
    const closed: string[] = [];
    const confirmed: string[] = [];
    const reopened: string[] = [];

    const allFindings = this.findingManager.getAllFindings();

    for (const finding of allFindings) {
      // Only process findings whose file was part of this scanned set
      if (!scannedSet.has(finding.evidence.path)) {
        continue;
      }

      const key = `${finding.rule}:${finding.evidence.path}`;
      const isStillPresent = detectedRuleFilePairs.has(key);
      const currentStatus = finding.status;

      if (isStillPresent) {
        // Violation still present after fix
        if (currentStatus === 'CLOSED' || currentStatus === 'VERIFIED') {
          // Regression: was closed but violation re-appeared (e.g. after rollback)
          this.updateFindingStatus(
            finding,
            'REGRESSION',
            'ROLLBACK_REOPENED',
            'Violation re-detected after rollback. Finding transitioned from CLOSED to REGRESSION.'
          );
          reopened.push(finding.id);
        } else {
          // Fix was attempted but did not eliminate the violation
          this.updateFindingStatus(
            finding,
            'CONFIRMED',
            'FIX_FAILED',
            'Violation still detected after auto-fix attempt. Finding confirmed as persistent.'
          );
          confirmed.push(finding.id);
        }
      } else {
        // Violation is absent — fix succeeded
        if (
          currentStatus === 'NEW' ||
          currentStatus === 'CONFIRMED' ||
          currentStatus === 'REGRESSION'
        ) {
          // Step 1: mark as verified (audit trail)
          this.updateFindingStatus(
            finding,
            'VERIFIED',
            'FIX_VERIFIED',
            'Violation no longer detected after auto-fix. Fix verified by targeted re-scan.'
          );
          // Step 2: close immediately (persisted state is CLOSED)
          this.updateFindingStatus(
            finding,
            'CLOSED',
            'AUTO_CLOSED',
            'Finding automatically closed after successful fix verification.'
          );
          closed.push(finding.id);
        }
        // CLOSED/SUPPRESSED findings with no violation: leave untouched
      }
    }

    return { closed, confirmed, reopened };
  }

  private updateFindingStatus(
    finding: Finding,
    newStatus: FindingStatus,
    action: string,
    notes: string
  ) {
    const previousStatus = finding.status;
    finding.status = newStatus;

    // Save finding record changes
    this.findingManager.saveFinding(finding);

    // Write history log
    this.findingManager.logHistoryEvent(finding.id, {
      timestamp: new Date().toISOString(),
      action,
      status: newStatus,
      notes: `${notes} (Transitioned from ${previousStatus} to ${newStatus})`,
    });
  }
}
export const defaultLifecycleVersion = '1.0.0';

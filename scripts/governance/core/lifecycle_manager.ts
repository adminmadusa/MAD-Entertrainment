// scripts/governance/core/lifecycle_manager.ts
import { FindingManager } from './finding_manager';
import { Finding, FindingStatus } from './types';

export class LifecycleManager {
  private findingManager: FindingManager;

  constructor(findingManager: FindingManager) {
    this.findingManager = findingManager;
  }

  /**
   * Evaluates and updates the state of all findings based on the active scan violations list.
   * @param detectedFindingIds Set of finding IDs that were detected in the current scan.
   */
  public reconcile(detectedFindingIds: Set<string>) {
    const allFindings = this.findingManager.getAllFindings();

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

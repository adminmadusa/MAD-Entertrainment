/**
 * LifecycleClassifier — Pure Data-Driven Classifier
 * Phase 6
 *
 * Resolves the canonical BranchLifecycleState of a branch based purely on
 * evaluated signals.
 *
 * Design constraints:
 *   - Pure function: no I/O, no Git commands, no external config lookups.
 *   - Protection status is treated orthogonally (a branch is classified by its
 *     lifecycle signals, and isProtected is returned as a separate property).
 *   - Captures classification reasons to aid audit visibility.
 */
import { BranchLifecycleState } from '../../platform/contracts';

export interface BranchSignals {
  readonly isProtected: boolean;
  readonly isMerged: boolean;
  readonly isSquashMerged: boolean;
  readonly hasOpenPR: boolean;
  readonly isStale: boolean;
  readonly hasUpstream: boolean;
  readonly ahead: number;
  readonly behind: number;
  readonly hasUniqueCommits: boolean;
  readonly isAnotherBranchBasedOnIt: boolean;
  readonly isPartOfActiveStack: boolean;
  readonly isLegacyDefault: boolean;
}

export interface ClassificationResult {
  readonly state: BranchLifecycleState;
  readonly reason: string;
  readonly confidence: 'PROVEN' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export class LifecycleClassifier {
  /**
   * Determine the BranchLifecycleState and the associated evidence/reason.
   * Deterministic, pure function.
   */
  public static classify(signals: BranchSignals): ClassificationResult {
    // 1. Archived (Legacy default branch, e.g. main)
    if (signals.isLegacyDefault) {
      return {
        state: BranchLifecycleState.ARCHIVED,
        reason: 'Branch is registered as the legacy repository default',
        confidence: 'PROVEN',
      };
    }

    const merged = signals.isMerged || signals.isSquashMerged;

    // 2. Merged & Ready for Deletion
    if (merged) {
      // If there are blocking downstream concerns, it's MERGED but not DELETE_READY
      const hasDownstreamBlocks =
        signals.isPartOfActiveStack ||
        signals.isAnotherBranchBasedOnIt;

      if (hasDownstreamBlocks) {
        return {
          state: BranchLifecycleState.MERGED,
          reason: 'Branch commits are merged, but active downstream dependencies or stack parents remain unpruned',
          confidence: 'HIGH',
        };
      }

      return {
        state: BranchLifecycleState.DELETE_READY,
        reason: 'Branch is fully merged/squash-merged into develop and contains no blocking dependencies',
        confidence: 'PROVEN',
      };
    }

    // 3. Open PR
    if (signals.hasOpenPR) {
      return {
        state: BranchLifecycleState.OPEN_PR,
        reason: 'Branch has an active open pull request on the remote coordinator',
        confidence: 'HIGH',
      };
    }

    // 4. Stale
    if (signals.isStale) {
      return {
        state: BranchLifecycleState.STALE,
        reason: 'Inactivity duration or lag commits exceed configured repository stale thresholds',
        confidence: 'HIGH',
      };
    }

    // 5. Orphaned (Local only, no upstream, and no commits)
    if (!signals.hasUpstream && !signals.hasUniqueCommits) {
      return {
        state: BranchLifecycleState.ORPHANED,
        reason: 'Branch is local-only with no upstream tracking reference and contains no unique commits',
        confidence: 'HIGH',
      };
    }

    // 6. Ready for PR
    if (signals.ahead > 0 && !signals.hasOpenPR) {
      return {
        state: BranchLifecycleState.READY_FOR_PR,
        reason: 'Branch contains local modifications (ahead of develop) but no open pull request is active',
        confidence: 'HIGH',
      };
    }

    // 7. Active Development (fallback default)
    return {
      state: BranchLifecycleState.ACTIVE,
      reason: 'Branch is actively developed within configured thresholds and has tracking references',
      confidence: 'MEDIUM',
    };
  }
}

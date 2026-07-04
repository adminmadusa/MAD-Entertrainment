/**
 * CleanupPlanner — Internal Platform Component
 * @internal ADR-008
 *
 * Translates Findings into abstract CleanupActions.
 * Contains ZERO shell syntax — all shell generation is the exclusive
 * responsibility of GitCommandBuilder.
 *
 * Design decisions:
 *  - Decisions are driven by a declarative ACTION_MAP (not a switch on ruleId).
 *    Adding a new rule requires only a new entry in ACTION_MAP.
 *  - Confidence gate: destructive actions (DELETE_*) are demoted to
 *    MANUAL_REVIEW when confidence is LOW or MEDIUM.
 *  - INFO-severity rules (naming, lag) produce no CleanupAction.
 */
import type { Finding, Confidence } from '../contracts/index';
import type { CleanupAction, ActionType } from '../contracts/index';

// ---------------------------------------------------------------------------
// Mapping table
// Renames, additions, or removals never require touching planner control flow.
// ---------------------------------------------------------------------------
interface ActionEntry {
  actionType: ActionType;
  targetBranch: string;
  preconditions: string[];
}

const ACTION_MAP: Readonly<Record<string, ActionEntry>> = {
  'git.branch.stale': {
    actionType: 'REBASE_SYNC',
    targetBranch: 'develop',
    preconditions: [
      'Branch is not protected',
      'Branch is not checked out in a worktree',
    ],
  },
  'git.branch.duplicate': {
    actionType: 'DELETE_LOCAL',
    targetBranch: 'develop',
    preconditions: [
      'Counterpart branch is merged',
      'No open PR',
    ],
  },
  'git.branch.orphaned': {
    actionType: 'MANUAL_REVIEW',
    targetBranch: '',
    preconditions: [
      'No active commits in last 30 days',
    ],
  },
  // git.branch.naming → INFO only, no action
  // git.ancestry.lag  → sync signal, no action
};

// ---------------------------------------------------------------------------
// Confidence gate
// ---------------------------------------------------------------------------
const DESTRUCTIVE: ReadonlySet<ActionType> = new Set(['DELETE_LOCAL', 'DELETE_REMOTE']);

function applyConfidenceGate(actionType: ActionType, confidence: Confidence): ActionType {
  const isDestructive = DESTRUCTIVE.has(actionType);
  // Confidence enum: HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW', PROVEN = 'PROVEN'
  const isBelowThreshold = confidence === 'LOW' || confidence === 'MEDIUM';
  return isDestructive && isBelowThreshold ? 'MANUAL_REVIEW' : actionType;
}

// ---------------------------------------------------------------------------
// CleanupPlanner
// ---------------------------------------------------------------------------
export class CleanupPlanner {
  /**
   * Translate a collection of Findings into a plan of abstract CleanupActions.
   * Pure function — no side effects, no I/O.
   */
  plan(findings: ReadonlyArray<Readonly<Finding>>): CleanupAction[] {
    const actions: CleanupAction[] = [];

    for (const finding of findings) {
      const entry = ACTION_MAP[finding.ruleId];
      if (!entry) continue; // rule produces no cleanup action (INFO / sync signal)

      const actionType = applyConfidenceGate(entry.actionType, finding.confidence);

      actions.push({
        branchName: finding.affectedBranch,
        actionType,
        targetBranch: entry.targetBranch,
        confidence: finding.confidence,
        preconditions: entry.preconditions,
      });
    }

    return actions;
  }

  /**
   * Returns the ACTION_MAP for inspection or testing. Read-only.
   */
  static readonly actionMap: Readonly<Record<string, ActionEntry>> = ACTION_MAP;
}

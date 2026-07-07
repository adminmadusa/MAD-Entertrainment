/**
 * @public
 * @contract ADR-006
 *
 * CleanupAction — abstract representation of a cleanup operation.
 *
 * Contains NO shell syntax. Shell command generation is exclusively the
 * responsibility of GitCommandBuilder (internal). Planners, writers, and
 * external tools must consume this type — never raw shell strings.
 */
import type { Confidence } from './governance-rule.js';

export type ActionType =
  | 'DELETE_LOCAL'
  | 'DELETE_REMOTE'
  | 'REBASE_SYNC'
  | 'MANUAL_REVIEW';

export interface CleanupAction {
  readonly branchName: string;
  readonly actionType: ActionType;
  readonly targetBranch: string;
  readonly confidence: Confidence;
  readonly preconditions: string[];  // Human-readable pre-conditions that must hold
}

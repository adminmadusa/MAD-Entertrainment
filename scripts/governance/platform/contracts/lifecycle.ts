/**
 * @public
 * @contract ADR-006
 *
 * BranchLifecycleState — the canonical set of states a branch may occupy.
 *
 * Used by the lifecycle classifier (Phase 6) to assign a deterministic
 * state to every branch in the repository. Rules and planners derive
 * recommendations from this state combined with other signals.
 */
export enum BranchLifecycleState {
  ACTIVE        = 'ACTIVE',        // Actively developed, has recent commits
  READY_FOR_PR  = 'READY_FOR_PR',  // Complete work, no open PR yet
  OPEN_PR       = 'OPEN_PR',       // PR is open and under review
  MERGED        = 'MERGED',        // Merged into integration branch
  DELETE_READY  = 'DELETE_READY',  // Proven safe to delete
  STALE         = 'STALE',         // No activity beyond threshold
  ARCHIVED      = 'ARCHIVED',      // Intentionally preserved, no further action
  ORPHANED      = 'ORPHANED',      // No parent branch, no open PR, no recent activity
}

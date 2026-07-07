/**
 * @public
 * @contract ADR-006
 *
 * Finding — immutable output of a GovernanceRule evaluation.
 *
 * Once emitted, a Finding is never modified. Scorers, planners, and writers
 * consume findings as read-only input. The `confidence` field must be
 * explicitly set by the rule — no implicit or inferred confidence values.
 */
import type { EngineContext } from './engine-context.js';

export type RuleCategory =
  | 'Branch Hygiene'
  | 'Repository Health'
  | 'Technical Debt'
  | 'Git Governance'
  | 'Security'
  | 'Documentation';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export enum Confidence {
  PROVEN = 'PROVEN',   // 100% certainty — e.g. identical tree SHA
  HIGH   = 'HIGH',     // Strong evidence — e.g. stale by commit count
  MEDIUM = 'MEDIUM',   // Partial evidence — e.g. possible superseded experiment
  LOW    = 'LOW',      // Heuristic-based inference
}

export interface Finding {
  readonly id: string;
  readonly ruleId: string;           // Namespaced: git.branch.stale
  readonly category: RuleCategory;
  readonly severity: Severity;
  readonly title: string;
  readonly evidence: string;
  readonly affectedBranch: string;
  readonly confidence: Confidence;
  readonly recommendation: string;
}

/**
 * @public
 * @contract ADR-006
 *
 * RuleMetadata — static descriptor attached to every GovernanceRule.
 * Consumed by the RuleRegistry for ordering, filtering, and display.
 */
export interface RuleMetadata {
  readonly id: string;              // Namespaced ID: git.branch.stale
  readonly name: string;
  readonly version: string;
  readonly category: RuleCategory;
  readonly severity: Severity;
  readonly enabled: boolean;
  readonly configurable: boolean;
  readonly tags: string[];
  readonly dependencies: string[];  // Rule IDs that must execute before this one
}

/**
 * @public
 * @contract ADR-006
 *
 * GovernanceRule — the atomic unit of governance evaluation.
 *
 * Every rule is stateless and deterministic: given the same EngineContext
 * it always produces the same Finding[]. Rules must not mutate the context
 * or communicate with each other directly.
 */
export interface GovernanceRule {
  readonly metadata: RuleMetadata;
  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>>;
}

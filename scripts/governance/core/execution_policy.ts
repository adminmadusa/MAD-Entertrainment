// scripts/governance/core/execution_policy.ts
import type { ApprovalPlan } from './approval_plan';
import type { FixContext } from './fix_context';
import type { Fixer } from './fix_types';
import type { StatelessViolation } from './types';

/**
 * Pluggable execution gate that determines whether a fixer should run
 * for a given violation and context.
 *
 * AutoFixEngine calls policy.shouldExecute() exactly once per violation,
 * replacing the previous inline safeOnly check. This keeps AutoFixEngine
 * free of any accumulated execution-specific condition logic.
 *
 * Known implementations:
 *   StandardExecutionPolicy   — always true (default)
 *   SafeOnlyExecutionPolicy   — only SAFE fixers
 *   InteractiveExecutionPolicy — ApprovalPlan gate (+ optional safety filter)
 *
 * Future extensions:
 *   CIExecutionPolicy         — CI restriction rules
 *   FeatureFlagExecutionPolicy — allow/deny lists
 */
export interface ExecutionPolicy {
  /**
   * Returns true if the fixer should be applied to the violation.
   * A false return causes AutoFixEngine to record the violation as skipped (not applied).
   */
  shouldExecute(
    violation: StatelessViolation,
    fixer: Fixer,
    context: FixContext
  ): boolean;
}

// ---------------------------------------------------------------------------
// Standard implementations
// ---------------------------------------------------------------------------

/**
 * Default policy — all fixers with a registered fixer are executed.
 * Used when neither --safe-only nor --interactive is set.
 */
export class StandardExecutionPolicy implements ExecutionPolicy {
  public shouldExecute(
    _violation: StatelessViolation,
    _fixer: Fixer,
    _context: FixContext
  ): boolean {
    return true;
  }
}

/**
 * Restricts execution to fixers classified as SAFE.
 * Applied when --safe-only is passed without --interactive.
 */
export class SafeOnlyExecutionPolicy implements ExecutionPolicy {
  public shouldExecute(
    _violation: StatelessViolation,
    fixer: Fixer,
    _context: FixContext
  ): boolean {
    return fixer.safety === 'SAFE';
  }
}

/**
 * Interactive gate — only executes fixers whose rule+file pair was
 * explicitly approved in the interactive session.
 *
 * Optionally enforces SAFE-only if the session was started with --safe-only.
 * MANUAL fixers require individual confirmation in the prompt loop;
 * if --safe-only is also set they are excluded before prompting.
 */
export class InteractiveExecutionPolicy implements ExecutionPolicy {
  private readonly plan: ApprovalPlan;
  private readonly safeOnly: boolean;

  constructor(plan: ApprovalPlan, safeOnly: boolean) {
    this.plan = plan;
    this.safeOnly = safeOnly;
  }

  public shouldExecute(
    violation: StatelessViolation,
    fixer: Fixer,
    _context: FixContext
  ): boolean {
    if (this.safeOnly && fixer.safety !== 'SAFE') return false;
    return this.plan.isApproved(violation.rule, violation.path);
  }
}

/**
 * Factory — resolves the correct policy from CLI flags and an optional plan.
 * Called by cli/fix.ts; nothing else should call this.
 */
export function resolveExecutionPolicy(options: {
  interactive: boolean;
  safeOnly: boolean;
  plan?: ApprovalPlan;
}): ExecutionPolicy {
  if (options.interactive && options.plan) {
    return new InteractiveExecutionPolicy(options.plan, options.safeOnly);
  }
  if (options.safeOnly) {
    return new SafeOnlyExecutionPolicy();
  }
  return new StandardExecutionPolicy();
}

// scripts/governance/core/approval_plan.ts

/**
 * Immutable value object representing the set of rule+file pairs approved
 * by the user during an interactive governance session.
 *
 * Built by InteractiveApprovalPolicy. Consumed by InteractiveExecutionPolicy.
 * Has no I/O, no lifecycle awareness, and no TTY dependency.
 */
export class ApprovalPlan {
  private readonly approved: ReadonlySet<string>;
  private readonly _skippedCount: number;

  /**
   * @param approvedPairs - Set of "ruleId:filePath" strings that were approved.
   * @param skippedCount  - Number of violations the user explicitly skipped or had no chance to approve.
   */
  constructor(approvedPairs: Set<string>, skippedCount: number) {
    // Defensive copy — the plan is immutable after construction
    this.approved = new Set(approvedPairs);
    this._skippedCount = skippedCount;
  }

  /**
   * Returns true if the given rule+file pair was explicitly approved.
   * Used as the gate predicate in InteractiveExecutionPolicy.
   */
  public isApproved(ruleId: string, filePath: string): boolean {
    return this.approved.has(`${ruleId}:${filePath}`);
  }

  /** Number of approved rule+file pairs. */
  public get approvedCount(): number {
    return this.approved.size;
  }

  /** Number of violations skipped (not approved) during the session. */
  public get skippedCount(): number {
    return this._skippedCount;
  }

  /**
   * Returns true if any fix for the given rule was approved, regardless of file.
   * Useful for quick rule-level filtering in summaries.
   */
  public hasRule(ruleId: string): boolean {
    for (const key of this.approved) {
      if (key.startsWith(`${ruleId}:`)) return true;
    }
    return false;
  }

  /**
   * Returns all approved (ruleId, filePath) pairs as structured objects.
   * Primarily for unit testing — do not use for execution decisions.
   */
  public entries(): Array<{ ruleId: string; filePath: string }> {
    return Array.from(this.approved).map(key => {
      const colonIndex = key.indexOf(':');
      return {
        ruleId: key.slice(0, colonIndex),
        filePath: key.slice(colonIndex + 1),
      };
    });
  }

  /** Returns the empty plan. Cancellation results in this. */
  public static empty(): ApprovalPlan {
    return new ApprovalPlan(new Set(), 0);
  }
}

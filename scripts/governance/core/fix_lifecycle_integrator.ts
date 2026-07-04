// scripts/governance/core/fix_lifecycle_integrator.ts
import { FixContext } from './fix_context';
import { FixResult } from './fix_result';
import { LifecycleManager } from './lifecycle_manager';
import { VerificationResult, VerifiedFinding } from './verification_result';
import { VerificationRunner } from './verification_runner';

/**
 * Orchestrates the post-fix governance finding lifecycle integration.
 *
 * Responsibilities (orchestration only — no direct finding mutations):
 *   1. Derive the scoped file + rule set from FixResult.
 *   2. Delegate re-scanning to VerificationRunner.
 *   3. Delegate lifecycle transitions to LifecycleManager.
 *   4. Assemble and return a VerificationResult for CLI reporting.
 *
 * Dependency chain: FixLifecycleIntegrator → LifecycleManager → FindingManager → Persistence
 * FindingManager is NOT directly received here to preserve encapsulation.
 */
export class FixLifecycleIntegrator {
  /**
   * Called after AutoFixEngine.execute() when fixes have been written to disk.
   * Runs a targeted re-scan of modified files and reconciles finding lifecycles.
   *
   * @param fixResult         - The result from AutoFixEngine.execute().
   * @param context           - The fix context (workspaceRoot, rule filter, logger, flags).
   * @param lifecycleManager  - The LifecycleManager instance (owns FindingManager internally).
   */
  public static async integrate(
    fixResult: FixResult,
    context: FixContext,
    lifecycleManager: LifecycleManager
  ): Promise<VerificationResult> {
    const start = Date.now();

    const stats = fixResult.stats;
    const modifiedFiles = stats.modifiedFiles;

    if (modifiedFiles.length === 0) {
      return buildEmptyResult(start);
    }

    // Derive rule IDs that were actually applied from the fix result items
    const affectedRuleIds = Array.from(
      new Set(
        fixResult.items
          .filter(item => item.applied && item.success)
          .map(item => item.ruleId)
      )
    );

    context.logger.log(
      `🔍 Verification pass: re-scanning ${modifiedFiles.length} modified file(s) ` +
      `for ${affectedRuleIds.length > 0 ? affectedRuleIds.join(', ') : 'all rules'}...`
    );

    // Run targeted re-scan (read-only)
    const stillPresent = await VerificationRunner.run(
      context.workspaceRoot,
      modifiedFiles,
      affectedRuleIds.length > 0 ? affectedRuleIds : undefined
    );

    context.logger.log(
      `🔍 Verification scan complete. ${stillPresent.size} violation(s) still present.`
    );

    // Reconcile lifecycle state via LifecycleManager (single mutation owner)
    const reconcileResult = lifecycleManager.reconcileTargeted(stillPresent, modifiedFiles);

    // Build per-finding verification details for the result
    const verifiedFindings = buildVerifiedFindings(
      fixResult,
      stillPresent,
      reconcileResult,
      lifecycleManager
    );

    context.logger.log(
      `✅ Lifecycle integration complete: ${reconcileResult.closed.length} closed, ` +
      `${reconcileResult.confirmed.length} confirmed, ${reconcileResult.reopened.length} reopened.`
    );

    return {
      verifiedFindings,
      verificationPassed: verifiedFindings.filter(f => f.verificationPassed).length,
      verificationFailed: verifiedFindings.filter(f => !f.verificationPassed).length,
      findingsClosed: reconcileResult.closed.length,
      findingsReopened: reconcileResult.reopened.length,
      elapsedMs: Date.now() - start,
    };
  }

  /**
   * Called after RollbackManager.rollbackLatest() to verify restored files
   * and only reopen findings where the violation has actually re-appeared.
   *
   * @param restoredFiles     - Workspace-relative paths restored by rollback.
   * @param context           - The fix context (workspaceRoot, logger, flags).
   * @param lifecycleManager  - The LifecycleManager instance.
   */
  public static async verifyAndReopenFindings(
    restoredFiles: string[],
    context: FixContext,
    lifecycleManager: LifecycleManager
  ): Promise<VerificationResult> {
    const start = Date.now();

    if (restoredFiles.length === 0) {
      return buildEmptyResult(start);
    }

    context.logger.log(
      `🔍 Post-rollback verification: re-scanning ${restoredFiles.length} restored file(s)...`
    );

    // Run a full scan (no rule restriction) on restored files
    const stillPresent = await VerificationRunner.run(
      context.workspaceRoot,
      restoredFiles
    );

    context.logger.log(
      `🔍 Post-rollback scan complete. ${stillPresent.size} violation(s) detected.`
    );

    // Reconcile: reopen only findings where violation re-appeared
    const reconcileResult = lifecycleManager.reconcileTargeted(stillPresent, restoredFiles);

    context.logger.log(
      `✅ Rollback lifecycle integration complete: ${reconcileResult.reopened.length} reopened as REGRESSION, ` +
      `${restoredFiles.length - reconcileResult.reopened.length} findings left unchanged (violation absent).`
    );

    return {
      verifiedFindings: [],        // no per-finding detail for rollback path
      verificationPassed: 0,
      verificationFailed: 0,
      findingsClosed: 0,
      findingsReopened: reconcileResult.reopened.length,
      elapsedMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildEmptyResult(start: number): VerificationResult {
  return {
    verifiedFindings: [],
    verificationPassed: 0,
    verificationFailed: 0,
    findingsClosed: 0,
    findingsReopened: 0,
    elapsedMs: Date.now() - start,
  };
}

/**
 * Constructs the per-finding detail array from the fix result and scan outcomes.
 * Uses the applied FixResultItem entries as the authoritative list of what was attempted.
 */
function buildVerifiedFindings(
  fixResult: FixResult,
  stillPresent: Set<string>,
  reconcileResult: { closed: string[]; confirmed: string[]; reopened: string[] },
  lifecycleManager: LifecycleManager
): VerifiedFinding[] {
  const findingMap = new Map<string, VerifiedFinding>();

  for (const item of fixResult.items) {
    if (!item.applied || !item.success) continue;

    const key = `${item.ruleId}:${item.filePath}`;
    const passed = !stillPresent.has(key);

    // Generate the same stable finding ID that FindingManager uses
    const findingId = lifecycleManager.getFindingManager().generateStableId(item.ruleId, item.filePath);

    if (!findingMap.has(key)) {
      findingMap.set(key, {
        findingId,
        ruleId: item.ruleId,
        filePath: item.filePath,
        verificationPassed: passed,
      });
    }
  }

  return Array.from(findingMap.values());
}

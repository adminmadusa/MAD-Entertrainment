// scripts/governance/cli/interactive_approval_policy.ts
import { resolve } from 'path';

import { ApprovalPlan } from '../core/approval_plan';
import { AuditEngine } from '../core/audit_engine';
import { ExecutionEngine } from '../core/execution_engine';
import type { FixContext } from '../core/fix_context';
import type { SafetyLevel } from '../core/fix_types';
import { FixRegistry } from '../core/fix_registry';
import type { InteractiveResult } from '../core/interactive_result';
import { MetadataProvider } from '../core/metadata';
import type {
  FixEntry,
  FixGroup,
  InteractionProvider,
} from './interactive_reporter';

/**
 * Coordinates the interactive approval loop.
 *
 * Responsibilities:
 *   1. Run a read-only pre-scan via ExecutionEngine (same filters as AutoFixEngine).
 *   2. Map violations to FixEntry objects, applying rule/path/safeOnly filters.
 *   3. Delegate ALL rendering to InteractionProvider.
 *   4. Process user choices (y/n/a/s/q) to build the approval set.
 *   5. Return an immutable ApprovalPlan and an InteractiveResult.
 *
 * Never: writes files, calls LifecycleManager, mutates FixRegistry,
 *        or imports readline directly.
 */
export class InteractiveApprovalPolicy {
  /**
   * Runs the interactive approval loop.
   *
   * @param context  - FixContext with all CLI flags set (read-only use).
   * @param reporter - InteractionProvider implementation to delegate UI to.
   * @returns The immutable ApprovalPlan and session statistics.
   */
  public static async gatherApprovals(
    context: FixContext,
    reporter: InteractionProvider
  ): Promise<{ plan: ApprovalPlan; result: InteractiveResult }> {
    const start = Date.now();

    // 1. Pre-scan — read-only, reuses existing execution infrastructure
    const entries = await InteractiveApprovalPolicy.scan(context);

    if (entries.length === 0) {
      context.logger.log('ℹ️  No applicable fixes found for the current filters.');
      reporter.showSessionSummary(0, 0, false);
      return {
        plan: ApprovalPlan.empty(),
        result: { approvedCount: 0, skippedCount: 0, cancelled: false, elapsedMs: Date.now() - start },
      };
    }

    // 2. Show grouped summary
    const groups = buildGroups(entries);
    reporter.showSummary(groups, entries.length);

    // 3. Approval loop
    const approved = new Set<string>();
    let skippedCount = 0;
    let applyAllSafe = false;
    let cancelled = false;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const key = `${entry.ruleId}:${entry.filePath}`;

      // 'a' was chosen earlier: auto-approve all remaining SAFE fixes
      if (applyAllSafe && entry.safety === 'SAFE') {
        approved.add(key);
        continue;
      }

      if (entry.safety === 'MANUAL') {
        const choice = await reporter.promptManualFix(entry, i + 1, entries.length);
        if (choice === 'y') {
          approved.add(key);
        } else {
          skippedCount++;
        }
        continue;
      }

      // SAFE fixer — full y/n/a/s/q choice
      const choice = await reporter.promptFix(entry, i + 1, entries.length);

      if (choice === 'y') {
        approved.add(key);
      } else if (choice === 'n') {
        skippedCount++;
      } else if (choice === 'a') {
        // Approve this fix AND all remaining SAFE fixes
        approved.add(key);
        applyAllSafe = true;
      } else if (choice === 's') {
        // Skip this and all remaining
        skippedCount += entries.length - i;
        break;
      } else if (choice === 'q') {
        // Quit — no files will be modified
        cancelled = true;
        reporter.showSessionSummary(approved.size, skippedCount, true);
        return {
          plan: ApprovalPlan.empty(),
          result: {
            approvedCount: 0,
            skippedCount: entries.length,
            cancelled: true,
            elapsedMs: Date.now() - start,
          },
        };
      }
    }

    reporter.showSessionSummary(approved.size, skippedCount, cancelled);

    const plan = new ApprovalPlan(approved, skippedCount);
    const result: InteractiveResult = {
      approvedCount: approved.size,
      skippedCount,
      cancelled,
      elapsedMs: Date.now() - start,
    };

    return { plan, result };
  }

  // ---------------------------------------------------------------------------
  // Internal — pre-scan
  // ---------------------------------------------------------------------------

  /**
   * Runs a read-only scan using ExecutionEngine and returns FixEntry objects
   * filtered by context.rule, context.path, and context.safeOnly.
   * Only violations that have a registered fixer are included.
   */
  private static async scan(context: FixContext): Promise<FixEntry[]> {
    const metadataProvider = new MetadataProvider();
    const metadata = metadataProvider.getMetadata();
    const auditEngine = new AuditEngine();
    metadata.knowledgeGraph = auditEngine.getKnowledgeGraph();

    const allFiles = auditEngine.getKnowledgeGraph().getIndexedFiles().sort();

    const filters: { rules?: string[] } = {};
    if (context.rule) {
      filters.rules = [context.rule];
    }

    const report = await ExecutionEngine.execute(allFiles, metadata, filters);

    const entries: FixEntry[] = [];
    const seen = new Set<string>();

    for (const res of report.results) {
      const allErrors = [...res.errors, ...res.warnings];
      for (const err of allErrors) {
        // Apply rule filter
        if (context.rule && err.rule !== context.rule) continue;

        // Apply path filter
        if (context.path) {
          const resolvedFilePath = resolve(context.workspaceRoot, err.file);
          const resolvedFilter = resolve(context.workspaceRoot, context.path);
          if (!resolvedFilePath.startsWith(resolvedFilter)) continue;
        }

        // Only include violations with a registered fixer
        if (!FixRegistry.supports(err.rule)) continue;

        const fixer = FixRegistry.get(err.rule)!;

        // Apply safeOnly filter
        if (context.safeOnly && fixer.safety !== 'SAFE') continue;

        // Deduplicate by rule:file (same dedup strategy as AutoFixEngine)
        const dedupeKey = `${err.rule}:${err.file}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        entries.push({
          ruleId: err.rule,
          filePath: err.file,
          safety: fixer.safety as SafetyLevel,
          message: err.message,
        });
      }
    }

    // Deterministic order: file → rule → message (mirrors AutoFixEngine sort)
    entries.sort((a, b) => {
      if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
      return a.ruleId.localeCompare(b.ruleId);
    });

    return entries;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildGroups(entries: FixEntry[]): FixGroup[] {
  const safe: FixGroup = { safety: 'SAFE', entries: [] };
  const manual: FixGroup = { safety: 'MANUAL', entries: [] };

  for (const entry of entries) {
    if (entry.safety === 'MANUAL') {
      manual.entries.push(entry);
    } else {
      safe.entries.push(entry);
    }
  }

  return [safe, manual];
}

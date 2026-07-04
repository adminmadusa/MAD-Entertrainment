/**
 * OrphanedBranchRule — git.branch.orphaned
 *
 * Emits an INFO Finding for every local branch that has no upstream
 * tracking ref, is not protected, and is not the default branch.
 * Orphaned branches have no visible parent and cannot be synced automatically.
 */
import type { GovernanceRule, Finding, EngineContext } from '../contracts/index';
import { Confidence } from '../contracts/index';
import { asGitSnapshot } from '../providers/git/git-snapshot-data';
import { isProtectedBranch } from '../../git-audit/validators/protection-validator';

export class OrphanedBranchRule implements GovernanceRule {
  readonly metadata = {
    id: 'git.branch.orphaned',
    name: 'Orphaned Local Branch',
    version: '1.0.0',
    category: 'Branch Hygiene' as const,
    severity: 'INFO' as const,
    enabled: true,
    configurable: false,
    tags: ['branch', 'hygiene', 'orphan'],
    dependencies: [],
  };

  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>> {
    const snapshot = asGitSnapshot(context.snapshot.data);
    const findings: Finding[] = [];

    for (const branch of snapshot.branches) {
      if (!branch.isLocal) continue;
      if (isProtectedBranch(branch.name)) continue;
      if (branch.name === 'main') continue;
      if (branch.upstream) continue; // has a tracking ref — not orphaned

      findings.push({
        id: `orphaned-${branch.name}`,
        ruleId: this.metadata.id,
        category: this.metadata.category,
        severity: this.metadata.severity,
        title: `Orphaned local branch: ${branch.name}`,
        evidence: `Local branch has no upstream tracking reference (git rev-parse --abbrev-ref "${branch.name}@{u}" fails)`,
        affectedBranch: branch.name,
        confidence: Confidence.PROVEN,
        recommendation: `Set upstream with: git branch --set-upstream-to=origin/${branch.name} ${branch.name}`,
      });
    }

    return findings;
  }
}

/**
 * StaleBranchRule — git.branch.stale
 * Migrated from: analyzers/dead-branches.ts → analyzeStaleStatus()
 *
 * Emits a WARNING Finding for every branch whose last commit is older
 * than the configured stale_days threshold, or that is behind develop
 * by more than stale_commit_threshold commits.
 */
import type { GovernanceRule, GovernanceConfig, Finding, EngineContext } from '../contracts/index';
import { Confidence } from '../contracts/index';
import { asGitSnapshot } from '../providers/git/git-snapshot-data';
import { isProtectedBranch } from '../../git-audit/validators/protection-validator';

export class StaleBranchRule implements GovernanceRule {
  readonly metadata = {
    id: 'git.branch.stale',
    name: 'Stale Branch',
    version: '1.0.0',
    category: 'Branch Hygiene' as const,
    severity: 'WARNING' as const,
    enabled: true,
    configurable: true,
    tags: ['branch', 'hygiene', 'stale'],
    dependencies: [],
  };

  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>> {
    const snapshot = asGitSnapshot(context.snapshot.data);
    const config = context.config as unknown as GovernanceConfig & { stale_days: number; max_branch_age: number };
    const staleDays = (config as unknown as Record<string, number>)['stale_days'] ?? 90;
    const findings: Finding[] = [];

    for (const branch of snapshot.branches) {
      if (isProtectedBranch(branch.name)) continue;
      if (branch.name === 'main' || branch.name === 'origin/main') continue;

      const nowMs = Date.now();
      const commitMs = branch.commitTime * 1000;
      const daysSince = Math.max(0, Math.floor((nowMs - commitMs) / (1000 * 60 * 60 * 24)));
      const lagCommits = branch.behind;

      const isStaleDays = daysSince > staleDays;
      const isStaleCommits = lagCommits > context.config.stale_commit_threshold;

      if (isStaleDays || isStaleCommits) {
        findings.push({
          id: `stale-${branch.name}`,
          ruleId: this.metadata.id,
          category: this.metadata.category,
          severity: this.metadata.severity,
          title: `Stale branch: ${branch.name}`,
          evidence: isStaleDays
            ? `No commits in ${daysSince} days (threshold: ${staleDays} days)`
            : `Behind develop by ${lagCommits} commits (threshold: ${context.config.stale_commit_threshold})`,
          affectedBranch: branch.name,
          confidence: Confidence.HIGH,
          recommendation: 'Merge, rebase, or archive this branch.',
        });
      }
    }

    return findings;
  }
}

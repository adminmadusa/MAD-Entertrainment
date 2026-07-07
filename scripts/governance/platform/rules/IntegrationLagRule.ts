/**
 * IntegrationLagRule — git.ancestry.lag
 * Migrated from: analyzers/ancestry.ts
 *
 * Emits a WARNING Finding for every unmerged, non-protected branch that is
 * behind develop by more than the configured stale_commit_threshold commits.
 * Uses already-collected ahead/behind data from BranchInfo — no subprocess calls.
 *
 * Dependencies: git.branch.stale, git.branch.orphaned, git.branch.duplicate
 * (declared so it runs after those rules have produced their findings,
 * allowing future rule executors to cross-correlate findings)
 */
import type { GovernanceRule, Finding, EngineContext } from '../contracts/index';
import { Confidence } from '../contracts/index';
import { asGitSnapshot } from '../providers/git/git-snapshot-data';
import { isProtectedBranch } from '../../git-audit/validators/protection-validator';

const INTEGRATION_BRANCHES = new Set([
  'develop', 'live', 'main',
  'origin/develop', 'origin/live', 'origin/main',
  'test/remediation-integration',
]);

export class IntegrationLagRule implements GovernanceRule {
  readonly metadata = {
    id: 'git.ancestry.lag',
    name: 'Integration Lag',
    version: '1.0.0',
    category: 'Git Governance' as const,
    severity: 'WARNING' as const,
    enabled: true,
    configurable: true,
    tags: ['branch', 'ancestry', 'lag', 'rebase'],
    dependencies: ['git.branch.stale', 'git.branch.orphaned', 'git.branch.duplicate'],
  };

  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>> {
    const snapshot = asGitSnapshot(context.snapshot.data);
    const threshold = context.config.stale_commit_threshold;
    const findings: Finding[] = [];

    for (const branch of snapshot.branches) {
      if (INTEGRATION_BRANCHES.has(branch.name)) continue;
      if (isProtectedBranch(branch.name)) continue;

      const verification = snapshot.verifications.get(branch.name);
      if (verification?.isMerged || verification?.isSquashMerged) continue;

      const lag = branch.behind;
      if (lag > 0 && lag <= threshold) {
        // Minor lag — sync signal, not a finding
        continue;
      }

      if (lag > threshold) {
        findings.push({
          id: `lag-${branch.name}`,
          ruleId: this.metadata.id,
          category: this.metadata.category,
          severity: this.metadata.severity,
          title: `Integration lag: ${branch.name}`,
          evidence: `Branch is behind develop by ${lag} commits (threshold: ${threshold}). 'behind develop' is a sync signal, not a deletion signal.`,
          affectedBranch: branch.name,
          confidence: Confidence.HIGH,
          recommendation: `Rebase or merge develop into this branch: git checkout ${branch.name} && git pull origin develop`,
        });
      }
    }

    return findings;
  }
}

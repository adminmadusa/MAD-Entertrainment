/**
 * DuplicateTreeRule — git.branch.duplicate
 * Migrated from: analyzers/duplicates.ts → analyzeDuplicateBranches()
 *
 * Emits a WARNING Finding for every branch whose tree SHA is identical to
 * another branch's tree SHA, indicating the branch is redundant.
 * Uses in-memory treeSha comparison (O(N²)) — no subprocess calls.
 */
import type { GovernanceRule, Finding, EngineContext } from '../contracts/index';
import { Confidence } from '../contracts/index';
import { asGitSnapshot } from '../providers/git/git-snapshot-data';

const INTEGRATION_BRANCHES = new Set([
  'develop', 'live', 'main',
  'origin/develop', 'origin/live', 'origin/main',
  'test/remediation-integration',
]);

export class DuplicateTreeRule implements GovernanceRule {
  readonly metadata = {
    id: 'git.branch.duplicate',
    name: 'Duplicate Tree Branch',
    version: '1.0.0',
    category: 'Technical Debt' as const,
    severity: 'WARNING' as const,
    enabled: true,
    configurable: false,
    tags: ['branch', 'duplicate', 'tree-sha'],
    dependencies: [],
  };

  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>> {
    const snapshot = asGitSnapshot(context.snapshot.data);
    const findings: Finding[] = [];
    const reported = new Set<string>();

    for (const current of snapshot.branches) {
      if (INTEGRATION_BRANCHES.has(current.name)) continue;
      if (reported.has(current.name)) continue;

      const cleanCurrent = current.name.replace('origin/', '');

      for (const other of snapshot.branches) {
        if (other.name === current.name) continue;
        if (INTEGRATION_BRANCHES.has(other.name)) continue;
        if (reported.has(other.name)) continue;

        const cleanOther = other.name.replace('origin/', '');
        if (cleanCurrent === cleanOther) continue; // local/remote pair of same branch

        const isSameTree =
          current.sha === other.sha ||
          (current.treeSha && other.treeSha && current.treeSha === other.treeSha);

        if (isSameTree) {
          findings.push({
            id: `duplicate-${current.name}`,
            ruleId: this.metadata.id,
            category: this.metadata.category,
            severity: this.metadata.severity,
            title: `Duplicate branch: ${current.name}`,
            evidence: `Tree SHA identical to branch '${other.name}' (treeSha: ${current.treeSha || current.sha})`,
            affectedBranch: current.name,
            confidence: Confidence.PROVEN,
            recommendation: `Review and delete the redundant branch. Counterpart: ${other.name}`,
          });
          reported.add(current.name);
          break;
        }
      }
    }

    return findings;
  }
}

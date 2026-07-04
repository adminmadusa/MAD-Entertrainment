/**
 * BranchNamingRule — git.branch.naming
 *
 * Emits an INFO Finding for every local branch that does not follow the
 * repository's approved naming convention. Protected and integration
 * branches are exempt.
 *
 * Approved prefixes (from REPOSITORY_GOVERNANCE.md):
 *   feat/ fix/ refactor/ audit/ docs/ test/ chore/ seo/
 */
import type { GovernanceRule, Finding, EngineContext } from '../contracts/index';
import { Confidence } from '../contracts/index';
import { asGitSnapshot } from '../providers/git/git-snapshot-data';
import { isProtectedBranch } from '../../git-audit/validators/protection-validator';

const ALLOWED_PREFIXES = [
  'feat/', 'fix/', 'refactor/', 'audit/', 'docs/',
  'test/', 'chore/', 'seo/',
];

const EXEMPT_NAMES = new Set([
  'develop', 'live', 'main',
  'origin/develop', 'origin/live', 'origin/main',
  'test/remediation-integration',
]);

export class BranchNamingRule implements GovernanceRule {
  readonly metadata = {
    id: 'git.branch.naming',
    name: 'Branch Naming Convention',
    version: '1.0.0',
    category: 'Git Governance' as const,
    severity: 'INFO' as const,
    enabled: true,
    configurable: false,
    tags: ['branch', 'naming', 'convention'],
    dependencies: [],
  };

  execute(context: EngineContext): ReadonlyArray<Readonly<Finding>> {
    const snapshot = asGitSnapshot(context.snapshot.data);
    const findings: Finding[] = [];

    for (const branch of snapshot.branches) {
      if (!branch.isLocal) continue;
      if (EXEMPT_NAMES.has(branch.name)) continue;
      if (isProtectedBranch(branch.name)) continue;

      const followsConvention = ALLOWED_PREFIXES.some(prefix =>
        branch.name.startsWith(prefix)
      );

      if (!followsConvention) {
        findings.push({
          id: `naming-${branch.name}`,
          ruleId: this.metadata.id,
          category: this.metadata.category,
          severity: this.metadata.severity,
          title: `Non-standard branch name: ${branch.name}`,
          evidence: `Branch does not start with an approved prefix: ${ALLOWED_PREFIXES.join(', ')}`,
          affectedBranch: branch.name,
          confidence: Confidence.PROVEN,
          recommendation: `Rename to follow convention, e.g.: feat/${branch.name} or fix/${branch.name}`,
        });
      }
    }

    return findings;
  }
}

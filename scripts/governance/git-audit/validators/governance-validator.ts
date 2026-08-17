export interface GovernanceReport {
  isCompliant: boolean;
  violations: string[];
}

export function validateGovernanceRules(branchName: string): GovernanceReport {
  const violations: string[] = [];
  const clean = branchName.replace('origin/', '');

  // 1. Check naming convention (must start with approved prefixes)
  const allowedPrefixes = ['develop', 'live', 'main', 'feat/', 'fix/', 'refactor/', 'audit/', 'docs/', 'test/', 'chore/', 'seo/'];
  const complies = allowedPrefixes.some(p => clean.startsWith(p));
  if (!complies) {
    violations.push(`Branch name '${clean}' does not match allowed governance prefixes.`);
  }

  // 2. Check duplicate / redundant patterns (like having duplicate server-hygiene branches)
  if (clean === 'fix/server-hygiene-duplicate-imports') {
    violations.push(`Branch '${clean}' is a redundant duplicate branch under HYG-002.`);
  }

  return {
    isCompliant: violations.length === 0,
    violations
  };
}

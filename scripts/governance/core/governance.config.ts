// scripts/governance/core/governance.config.ts

export const governanceConfig = {
  sharedComponentScopes: [
    'apps/admin',
    'apps/web',
  ],
  sharedComponentEnforcement: {
    ignoreFiles: [
      '**/AdminShell.tsx',
      '**/AdminSidebar.tsx',
      '**/MobileNavigation.tsx',
    ],
  },
  documentationGovernance: {
    approvedGeneratedDirs: [
      'reports/',
      '.governance/'
    ],
    disallowedTempPatterns: [
      'temp',
      'tmp',
      'draft',
      'backup'
    ],
    exemptEntrypoints: [
      'README.md',
      'REPOSITORY_GOVERNANCE.md',
      '.agents/AGENTS.md',
      'docs/decisions/README.md',
      'docs/decisions/ADR_INDEX.md',
      'docs/decisions/ADR_TEMPLATE.md'
    ],
    duplicateThreshold: {
      error: 95,
      warn: 85
    },
    // Configuration location for rule enforcement levels.
    // Promotion from WARN to FAIL_BUILD will happen after successful validation.
    enforcement: {
      'VAL-DOC-001': 'FAIL_BUILD', // Local workstation paths
      'VAL-DOC-002': 'FAIL_BUILD', // Absolute filesystem paths
      'VAL-DOC-003': 'FAIL_BUILD', // Broken link targets
      'VAL-DOC-004': 'FAIL_BUILD', // Case-sensitive filename casing
      'VAL-DOC-005': 'WARN',       // Secret & credential detection (staged rollout)
      'VAL-DOC-006': 'WARN',       // Duplicate document detection (staged rollout)
      'VAL-DOC-007': 'WARN',       // Reachability-based orphan detection (staged rollout)
      'VAL-DOC-008': 'FAIL_BUILD'  // Lifecycle classification
    }
  }
};

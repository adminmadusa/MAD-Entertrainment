// scripts/governance/core/governance.config.ts

export const governanceConfig = {
  /**
   * SCAN SCOPE BOUNDARIES
   *
   * These settings define which paths are excluded from governance scanning.
   * All validators MUST read from this configuration — no path logic should
   * be hardcoded inside individual validator files.
   *
   * Any change to these exclusions requires Architecture Review Board approval
   * and a rationale comment explaining why the path is outside governance scope.
   *
   * excludedPaths:
   *   Paths excluded from ALL governance validation (knowledge graph indexing,
   *   hygiene rules, architecture rules, UI rules). These are developer tooling
   *   directories that are not production application code.
   *
   *   - 'scripts/governance': The governance engine itself. Its TypeScript files
   *     predate the import hygiene rules (VAL-HYG-001/003) it enforces. Scanning
   *     it creates 183 false-positive self-violations. Compliance will be addressed
   *     in a dedicated hygiene pass once rules stabilise.
   *   - '.agents': AI agent skill definitions and workflow files. Developer tooling,
   *     not production source code. Subject to its own review model.
   *
   * documentationExclusions:
   *   Paths excluded ONLY from documentation-specific rules: ownership metadata
   *   requirements (Missing Document Owner), orphan detection (VAL-DOC-007), and
   *   freshness SLA checks. These paths contain archival or non-documentation content
   *   that must remain in the repository for reference but should not be required to
   *   satisfy active documentation governance standards.
   *
   *   - 'docs/archive': Historical audit records and branch-cleanup reports.
   *     Kept for compliance reference only. Requiring owner metadata and entrypoint
   *     links on closed audit documents adds noise without operational value.
   *   - 'apps/web/src/content/legal': Application legal content pages (ToS, Privacy).
   *     These are website content files served at runtime, not repository documentation.
   */
  scanScope: {
    excludedPaths: [
      'scripts/governance',
      '.agents',
      'docs/archive',
    ] as string[],
    documentationExclusions: [
      'docs/archive',
      'apps/web/src/content/legal',
    ] as string[],
  },


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
    duplicateExclusions: [
      'docs/governance/rules'
    ],
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

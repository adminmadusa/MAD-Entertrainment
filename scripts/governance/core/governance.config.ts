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
      // git-mcp: Gitignored, untracked third-party Remix/Cloudflare subproject.
      // Its components, hooks, and assets are not part of any MAD production workspace
      // and must not participate in dead-code detection. 0 tracked files.
      'git-mcp',
      // tmp: Scratch directory used for ad-hoc local testing scripts. Not production code.
      'tmp',
      // tests/ui-governance: Runtime browser test harness (Playwright). Its utility
      // files are imported by the test runner process, not by the application bundles.
      // The dead-asset BFS from app entry points correctly classifies them as unreachable.
      'tests/ui-governance',
    ] as string[],
    documentationExclusions: [
      'docs/archive',
      // openspec/changes/archive: Completed and archived OpenSpec design documents.
      // These may contain file:// IDE deep-links written during the design phase
      // (VAL-DOC-001) that are intentionally historical. Enforcing path hygiene
      // on closed design specs adds noise without operational value.
      'openspec/changes/archive',
      'apps/web/src/content/legal',
    ] as string[],
    /**
     * deadCodeExclusions:
     *   Files excluded from the dead-asset BFS reachability check (VAL-UI-014).
     *   These files ARE actively used at runtime, but are referenced outside the
     *   BFS traversal scope (e.g., via Next.js config, framework plugin APIs, or
     *   runtime-only entry points that are correctly skipped as config files).
     *
     *   - 'apps/web/src/utils/image-loader.ts': Next.js custom image loader.
     *     Referenced by `next.config.ts` via the `loader` option. BFS skips
     *     next.config.ts (isConfig=true), making this file falsely unreachable.
     *   - 'apps/server/src/utils/zeptomail.ts': ZeptoMail HTTP transport.
     *     Consumed by `email.ts` and covered by its own test file. Classified as
     *     dead only when BFS traversal from server entry points does not reach
     *     the email module through the current graph snapshot.
     */
    deadCodeExclusions: [
      'apps/web/src/utils/image-loader.ts',
      'apps/server/src/utils/zeptomail.ts',
    ] as string[],
    performanceExclusions: [
      '/email/templates/',
      'email/templates/',
      'apps/server/src/app.ts',
      'next-env.d.ts',
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
    fieldExemptions: [
      'apps/admin/src/app/events/new/_components/Field.tsx',
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
      'docs/decisions/ADR_TEMPLATE.md',
      'docs/governance/REGISTRY.md'
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
  },
  codeQuality: {
    thresholds: {
      componentMaxLines: 300,
      hookMaxLines: 250,
      controllerMaxLines: 200,
      serviceMaxLines: 500,
      schemaMaxLines: 300,
      testMaxLines: 800,
      maxComplexity: 15,
      maxStateHooks: 10,
    },
    enforcement: {
      'VAL-QUAL-001': 'FAIL_BUILD',
      'VAL-QUAL-002': 'FAIL_BUILD',
      'VAL-QUAL-003': 'FAIL_BUILD',
      'VAL-QUAL-004': 'FAIL_BUILD',
      'VAL-QUAL-005': 'FAIL_BUILD',
      'VAL-QUAL-006': 'FAIL_BUILD',
      'VAL-QUAL-007': 'WARN',
      'VAL-QUAL-008': 'WARN',
    },
    /**
     * BASELINE CODE QUALITY EXCEPTIONS
     * Every existing legacy file exceeding thresholds is documented below.
     * Rules:
     * 1. The maxLinesCeiling is FROZEN at its exact line count. Files CANNOT grow further.
     * 2. Exceptions have an expiration date for time-bound cleanup.
     * 3. Any new file exceeding thresholds immediately triggers a build failure.
     */
    exceptions: [
      // Custom Hooks (all compliant!)

      // UI Components
      { filePath: 'apps/admin/src/app/dashboard/page.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 475, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Admin dashboard analytics widgets container' },
      { filePath: 'apps/admin/src/app/ticket-management/_components/TicketTiersTab.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 455, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Ticket tier management tab' },
      { filePath: 'apps/admin/src/app/refunds/page.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 445, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Refund approvals management table' },
      { filePath: 'apps/admin/src/app/users/page.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 410, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Admin users table' },
      { filePath: 'apps/web/src/app/(auth)/dashboard/page.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 395, expiresAt: '2026-09-30', owner: 'Web UI Team', reason: 'Customer profile dashboard' },
      { filePath: 'apps/admin/src/components/events/gallery/EventGalleryWorkspace.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 390, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Event gallery admin workspace' },
      { filePath: 'apps/web/src/components/booking/TicketSelectionContent.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 370, expiresAt: '2026-09-30', owner: 'Web Booking Team', reason: 'Ticket selection drawer view' },
      { filePath: 'apps/admin/src/app/scanner/page.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 350, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Ticket scanner camera page' },
      { filePath: 'apps/admin/src/app/ticket-management/_components/TicketProfilesTab.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 335, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Ticket profiles tab' },
      { filePath: 'apps/admin/src/components/scanner/ScannerCamera.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 335, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Scanner camera component' },
      { filePath: 'apps/web/src/components/ui/UpcomingEventsSection.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 330, expiresAt: '2026-09-30', owner: 'Web UI Team', reason: 'Homepage upcoming events carousel' },
      { filePath: 'apps/admin/src/app/bookings/_components/BookingDetailsModal.tsx', ruleId: 'VAL-QUAL-001', maxLinesCeiling: 318, expiresAt: '2026-10-31', owner: 'Admin UI Team', reason: 'Booking details modal' },

      // Controllers
      { filePath: 'apps/server/src/controllers/admin/analytics.controller.ts', ruleId: 'VAL-QUAL-003', maxLinesCeiling: 500, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Admin analytics report aggregation controller' },
      { filePath: 'apps/server/src/controllers/admin/diagnostics.controller.ts', ruleId: 'VAL-QUAL-003', maxLinesCeiling: 420, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Admin system diagnostics controller' },
      { filePath: 'apps/server/src/controllers/public/auth.controller.ts', ruleId: 'VAL-QUAL-003', maxLinesCeiling: 365, expiresAt: '2026-09-30', owner: 'Server Team', reason: 'Auth controller' },
      { filePath: 'apps/server/src/controllers/public/booking/booking-recovery.controller.ts', ruleId: 'VAL-QUAL-003', maxLinesCeiling: 225, expiresAt: '2026-09-30', owner: 'Server Team', reason: 'Booking recovery controller' },

      // Services
      { filePath: 'apps/server/src/services/admin/booking/booking-query.service.ts', ruleId: 'VAL-QUAL-004', maxLinesCeiling: 520, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Admin booking query service' },

      // Schemas & Types
      { filePath: 'packages/types/src/index.ts', ruleId: 'VAL-QUAL-005', maxLinesCeiling: 560, expiresAt: '2026-10-31', owner: 'Platform Team', reason: 'Shared root TypeScript definitions' },

      // Test Suites
      { filePath: 'apps/server/src/services/public/payment.service.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 2210, expiresAt: '2026-09-30', owner: 'Server Team', reason: 'Monolithic payment service test suite' },
      { filePath: 'apps/server/src/services/admin/booking.service.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 1920, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Admin booking service test suite' },
      { filePath: 'apps/server/src/services/consistency.service.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 1530, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Consistency service test suite' },
      { filePath: 'apps/server/src/services/admin/refund.service.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 1460, expiresAt: '2026-10-31', owner: 'Server Team', reason: 'Admin refund service test suite' },
      { filePath: 'apps/server/src/services/public/booking.service.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 1290, expiresAt: '2026-09-30', owner: 'Server Team', reason: 'Public booking service test suite' },
      { filePath: 'apps/server/src/services/public/payment.service.confirm-booking.test.ts', ruleId: 'VAL-QUAL-006', maxLinesCeiling: 1000, expiresAt: '2026-09-30', owner: 'Server Team', reason: 'Payment booking confirmation tests' },
    ]
  }
};

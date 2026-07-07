// scripts/governance/rules/metadata/UX.ts
import { RuleDefinition } from '../types';

// ─── UI-001 UX Governance Rules (VAL-UX-001 → VAL-UX-003) ────────────────────
// These rules enforce behavioral experience standards from the MAD UI/UX
// Governance Standard (UI-001) and INTERACTION_GUIDELINES.md.
// Source: UI_UX_GOVERNANCE.md Sections 13 & 14
// Registry: docs/governance/REGISTRY.md
// ─────────────────────────────────────────────────────────────────────────────

export const uxRules: RuleDefinition[] = [
  {
    id: 'VAL-UX-001',
    name: 'Missing Loading State',
    description:
      'Detects async data-fetching components (React Query, SWR, useEffect with API calls) that do not implement a loading state. Every async boundary must show a skeleton or progress indicator.',
    category: 'UX',
    severity: 'HIGH',
    confidence: 0.80,
    owner: 'UI UX Guild',
    defaultStatus: 'NEW',
    ciPolicy: 'WARN',
    documentation: 'docs/governance/rules/VAL-UX-001.md',
    remediation:
      'Add a loading state branch. Prefer skeleton screens for loads > 1s. See INTERACTION_GUIDELINES.md Loading Patterns.',
    supportsAutofix: false,
    version: '1.0.0',
    introducedVersion: '1.0.0',
    status: 'ACTIVE',
    tags: ['ux', 'loading', 'states', 'ui-001', 'static-analysis'],
    governanceSource: {
      document: 'UI_UX_GOVERNANCE.md',
      section: '14. Loading Experience',
      standard: 'UI-001',
    },
    defaultLifecycle: 'NEW',
    documentationLink: 'UI_UX_GOVERNANCE.md#14-loading-experience',
  },
  {
    id: 'VAL-UX-002',
    name: 'Missing Empty State',
    description:
      'Detects list and table components that render an empty container when data is absent, without implementing a proper empty state (icon, explanation, and primary action).',
    category: 'UX',
    severity: 'HIGH',
    confidence: 0.75,
    owner: 'UI UX Guild',
    defaultStatus: 'NEW',
    ciPolicy: 'WARN',
    documentation: 'docs/governance/rules/VAL-UX-002.md',
    remediation:
      'Implement an empty state with a contextual icon, explanatory text, and a primary call-to-action. Never render a blank container. See INTERACTION_GUIDELINES.md Empty States.',
    supportsAutofix: false,
    version: '1.0.0',
    introducedVersion: '1.0.0',
    status: 'ACTIVE',
    tags: ['ux', 'empty-state', 'states', 'ui-001', 'static-analysis'],
    governanceSource: {
      document: 'UI_UX_GOVERNANCE.md',
      section: '13. Empty States',
      standard: 'UI-001',
    },
    defaultLifecycle: 'NEW',
    documentationLink: 'UI_UX_GOVERNANCE.md#13-empty-states',
  },
  {
    id: 'VAL-UX-003',
    name: 'Missing Error State',
    description:
      'Detects async components that do not handle the error case. Every async boundary must implement an error state that explains what went wrong and provides a retry action.',
    category: 'UX',
    severity: 'HIGH',
    confidence: 0.80,
    owner: 'UI UX Guild',
    defaultStatus: 'NEW',
    ciPolicy: 'WARN',
    documentation: 'docs/governance/rules/VAL-UX-003.md',
    remediation:
      'Add an error state branch with a user-friendly message and a Retry button. Wrap page-level components in ErrorBoundary. See INTERACTION_GUIDELINES.md Error Handling.',
    supportsAutofix: false,
    version: '1.0.0',
    introducedVersion: '1.0.0',
    status: 'ACTIVE',
    tags: ['ux', 'error-state', 'states', 'ui-001', 'static-analysis'],
    governanceSource: {
      document: 'UI_UX_GOVERNANCE.md',
      section: '22. Merge Gate',
      standard: 'UI-001',
    },
    defaultLifecycle: 'NEW',
    documentationLink: 'INTERACTION_GUIDELINES.md#4-error-handling',
  },
];

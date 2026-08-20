// scripts/governance/rules/types.ts

export type RuleCategory =
  | 'UI'
  | 'UX'
  | 'ACCESSIBILITY'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'ARCHITECTURE'
  | 'DOCUMENTATION'
  | 'HYGIENE'
  | 'REPOSITORY'
  | 'INFRASTRUCTURE'
  | 'CODE_QUALITY';

export type RuleSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RuleStatus = 'ACTIVE' | 'DEPRECATED' | 'EXPERIMENTAL' | 'DISABLED';

export type RuleCiPolicy = 'INFO_ONLY' | 'WARN' | 'FAIL_BUILD';

export type RuleOwner =
  | 'UI UX Guild'
  | 'Platform Team'
  | 'Security Guild'
  | 'Security Team'
  | 'Architecture Guild'
  | 'Architecture Review Board'
  | 'DevOps Team'
  | 'Documentation Team';

export interface GovernanceSource {
  /** The governing document file (e.g. 'UI_UX_GOVERNANCE.md') */
  document: string;
  /** The section number or heading within the document (e.g. 'Section 14', '15. Accessibility') */
  section: string;
  /** The standard identifier (e.g. 'UI-001') */
  standard: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  confidence: number;
  owner: RuleOwner;
  defaultStatus: string;
  ciPolicy: RuleCiPolicy;
  documentation: string;
  remediation: string;
  supportsAutofix: boolean;
  version: string;
  introducedVersion: string;
  deprecatedVersion?: string;
  status: RuleStatus;
  tags: string[];

  /**
   * Traceability: links this rule to the governing standard, document, and section.
   * Enables the chain: CI result → VAL-ID → governanceSource → standard → policy.
   * Required for all UI-001 rules. Optional for legacy rules.
   *
   * Rich content (examples, references, rationale) lives exclusively in the
   * per-rule markdown file at the `documentation` path above.
   */
  governanceSource?: GovernanceSource;

  // Backwards compatibility fields for the existing engine
  defaultLifecycle?: string;
  documentationLink?: string;
}


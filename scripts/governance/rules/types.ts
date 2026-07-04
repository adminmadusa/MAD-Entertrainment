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
  | 'INFRASTRUCTURE';

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

  // Backwards compatibility fields for the existing engine
  defaultLifecycle?: string;
  documentationLink?: string;
}

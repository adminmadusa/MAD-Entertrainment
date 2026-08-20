// scripts/governance/rules/registry.ts
import { RuleDefinition, RuleCategory, RuleSeverity, RuleOwner, RuleCiPolicy, RuleStatus } from './types';
import { uiRules } from './metadata/UI';
import { uxRules } from './metadata/UX';
import { accessibilityRules } from './metadata/ACCESSIBILITY';
import { securityRules } from './metadata/SECURITY';
import { performanceRules } from './metadata/PERFORMANCE';
import { architectureRules } from './metadata/ARCHITECTURE';
import { docRules } from './metadata/DOCUMENTATION';
import { hygieneRules } from './metadata/HYGIENE';
import { codeQualityRules } from './metadata/CODE_QUALITY';

const VALID_CATEGORIES = new Set<RuleCategory>([
  'UI',
  'UX',
  'ACCESSIBILITY',
  'SECURITY',
  'PERFORMANCE',
  'ARCHITECTURE',
  'DOCUMENTATION',
  'HYGIENE',
  'REPOSITORY',
  'INFRASTRUCTURE',
  'CODE_QUALITY',
]);

const VALID_SEVERITIES = new Set<RuleSeverity>([
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
]);

const VALID_CI_POLICIES = new Set<RuleCiPolicy>([
  'INFO_ONLY',
  'WARN',
  'FAIL_BUILD',
]);

const VALID_STATUSES = new Set<RuleStatus>([
  'ACTIVE',
  'DEPRECATED',
  'EXPERIMENTAL',
  'DISABLED',
]);

const VALID_OWNERS = new Set<RuleOwner>([
  'UI UX Guild',
  'Platform Team',
  'Security Guild',
  'Security Team',
  'Architecture Guild',
  'Architecture Review Board',
  'DevOps Team',
  'Documentation Team',
]);

export class RuleRegistry {
  private static rules = new Map<string, RuleDefinition>();
  private static initialized = false;

  public static initialize() {
    if (this.initialized) return;

    const allRulesList: RuleDefinition[] = [
      ...uiRules,
      ...uxRules,
      ...accessibilityRules,
      ...securityRules,
      ...performanceRules,
      ...architectureRules,
      ...docRules,
      ...hygieneRules,
      ...codeQualityRules,
    ];

    const names = new Set<string>();

    for (const rule of allRulesList) {
      // 1. Fail fast on duplicate rule IDs
      if (this.rules.has(rule.id)) {
        throw new Error(`Governance Registry Validation Error: Duplicate Rule ID detected: "${rule.id}"`);
      }

      // 2. Fail fast on duplicate names
      if (names.has(rule.name)) {
        throw new Error(`Governance Registry Validation Error: Duplicate Rule Name detected: "${rule.name}"`);
      }

      // 3. Category Validation
      if (!VALID_CATEGORIES.has(rule.category)) {
        throw new Error(`Governance Registry Validation Error: Invalid Category "${rule.category}" on Rule "${rule.id}"`);
      }

      // 4. Severity Validation
      if (!VALID_SEVERITIES.has(rule.severity)) {
        throw new Error(`Governance Registry Validation Error: Invalid Severity "${rule.severity}" on Rule "${rule.id}"`);
      }

      // 5. Owner Validation
      if (!VALID_OWNERS.has(rule.owner)) {
        throw new Error(`Governance Registry Validation Error: Invalid Owner "${rule.owner}" on Rule "${rule.id}"`);
      }

      // 6. CI Policy Validation
      if (!VALID_CI_POLICIES.has(rule.ciPolicy)) {
        throw new Error(`Governance Registry Validation Error: Invalid CI Policy "${rule.ciPolicy}" on Rule "${rule.id}"`);
      }

      // 7. Status Validation
      if (!VALID_STATUSES.has(rule.status)) {
        throw new Error(`Governance Registry Validation Error: Invalid Status "${rule.status}" on Rule "${rule.id}"`);
      }

      // 8. Confidence Range Validation
      if (rule.confidence < 0 || rule.confidence > 1) {
        throw new Error(`Governance Registry Validation Error: Invalid Confidence range "${rule.confidence}" on Rule "${rule.id}". Must be between 0 and 1.`);
      }

      // 9. Documentation Path Validation
      if (!rule.documentation.startsWith('docs/governance/rules/')) {
        throw new Error(`Governance Registry Validation Error: Invalid Documentation Path "${rule.documentation}" on Rule "${rule.id}". Must reside under docs/governance/rules/`);
      }

      // Register backwards compatibility fields
      rule.defaultLifecycle = rule.defaultStatus;
      rule.documentationLink = rule.documentation;

      this.rules.set(rule.id, rule);
      names.add(rule.name);
    }

    this.initialized = true;
  }

  public static getRule(id: string): RuleDefinition | undefined {
    this.initialize();
    return this.rules.get(id);
  }

  public static getAllRules(): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values());
  }

  public static getRulesByCategory(category: string): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values()).filter(r => r.category === category);
  }

  public static getRulesByOwner(owner: string): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values()).filter(r => r.owner === owner);
  }

  public static getRulesBySeverity(severity: string): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values()).filter(r => r.severity === severity);
  }

  public static getRulesByPolicy(policy: string): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values()).filter(r => r.ciPolicy === policy);
  }

  public static getRulesByTag(tag: string): RuleDefinition[] {
    this.initialize();
    return Array.from(this.rules.values()).filter(r => r.tags.includes(tag));
  }

  public static ruleExists(id: string): boolean {
    this.initialize();
    return this.rules.has(id);
  }

  // Helper for test cleanup
  public static reset() {
    this.rules.clear();
    this.initialized = false;
  }
}

export const ruleRegistryVersion = '1.0.0';

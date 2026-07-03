// scripts/governance/rules/registry.ts
import { RuleDefinition } from '../core/types';
import { uiRules } from './ui.rules';
import { securityRules } from './security.rules';
import { performanceRules } from './performance.rules';
import { architectureRules } from './architecture.rules';
import { docRules } from './documentation.rules';

export class RuleRegistry {
  private static rules = new Map<string, RuleDefinition>();
  private static initialized = false;

  public static initialize() {
    if (this.initialized) return;

    const allRules: RuleDefinition[] = [
      ...uiRules,
      ...securityRules,
      ...performanceRules,
      ...architectureRules,
      ...docRules,
    ];

    for (const rule of allRules) {
      this.rules.set(rule.id, rule);
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
}
export const ruleRegistryVersion = '1.0.0';

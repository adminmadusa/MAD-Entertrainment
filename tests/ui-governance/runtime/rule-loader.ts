import { RuleRegistry } from '../../../scripts/governance/rules/registry';

// Initialize RuleRegistry if it hasn't been initialized
try {
  RuleRegistry.initialize();
} catch (e) {
  // Silent fallback
}

export interface RuleMetadata {
  id: string;
  name: string;
  severity: string;
  ciPolicy: string;
}

export class RuleLoader {
  public static getRuleMetadata(ruleId: string): RuleMetadata {
    const registryRule = RuleRegistry.getRule(ruleId);
    if (registryRule) {
      return {
        id: registryRule.id,
        name: registryRule.name,
        severity: registryRule.severity,
        ciPolicy: registryRule.ciPolicy
      };
    }

    // Default fallback if not registered yet
    return {
      id: ruleId,
      name: 'Runtime Governed Rule',
      severity: 'HIGH',
      ciPolicy: 'WARN'
    };
  }
}

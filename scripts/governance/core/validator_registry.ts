// scripts/governance/core/validator_registry.ts
import { GovernanceValidator } from './validator';
import { RuleRegistry } from '../rules/registry';

export interface ValidatorDefinition {
  id: string;
  name: string;
  supportedRules: string[];
  supportedFileTypes: string[];
  priority: number;
  dependencies: string[];
  enabled: boolean;
  validator: GovernanceValidator;
}

export class ValidatorRegistry {
  private static validators = new Map<string, ValidatorDefinition>();
  private static initialized = false;

  public static initialize() {
    if (this.initialized) return;
    this.validators.clear();
    this.initialized = true;
  }

  public static registerValidator(validator: GovernanceValidator, metadata?: Partial<Omit<ValidatorDefinition, 'validator' | 'name'>>) {
    this.initialize();

    const id = metadata?.id || validator.name || validator.constructor.name;

    // Fail fast for duplicate validator IDs
    if (this.validators.has(id)) {
      throw new Error(`Validator Registry Error: Duplicate validator ID detected: "${id}"`);
    }

    const definition: ValidatorDefinition = {
      id,
      name: validator.name,
      supportedRules: metadata?.supportedRules || [],
      supportedFileTypes: metadata?.supportedFileTypes || ['*'],
      priority: metadata?.priority ?? 100,
      dependencies: metadata?.dependencies || [],
      enabled: metadata?.enabled ?? true,
      validator,
    };

    this.validators.set(id, definition);
  }

  public static registerValidators(validators: { validator: GovernanceValidator; metadata?: Partial<Omit<ValidatorDefinition, 'validator' | 'name'>> }[]) {
    for (const item of validators) {
      this.registerValidator(item.validator, item.metadata);
    }
  }

  public static unregisterValidator(id: string) {
    this.initialize();
    this.validators.delete(id);
  }

  public static getValidator(id: string): ValidatorDefinition | undefined {
    this.initialize();
    return this.validators.get(id);
  }

  public static getAllValidators(): ValidatorDefinition[] {
    this.initialize();
    return Array.from(this.validators.values());
  }

  public static getValidatorsByCategory(category: string): ValidatorDefinition[] {
    this.initialize();
    return Array.from(this.validators.values()).filter(def => {
      return def.supportedRules.some(ruleId => {
        const rule = RuleRegistry.getRule(ruleId);
        return rule?.category === category;
      });
    });
  }

  public static getValidatorsByRule(ruleId: string): ValidatorDefinition[] {
    this.initialize();
    return Array.from(this.validators.values()).filter(def => def.supportedRules.includes(ruleId));
  }

  public static validatorExists(id: string): boolean {
    this.initialize();
    return this.validators.has(id);
  }

  public static validateRegistry() {
    this.initialize();
    const rulesUsed = new Set<string>();

    for (const [id, def] of this.validators) {
      // 1. Validate that supported rules exist in the RuleRegistry
      for (const ruleId of def.supportedRules) {
        if (!RuleRegistry.ruleExists(ruleId)) {
          throw new Error(`Validator Registry Validation Error: Validator "${id}" references unregistered rule "${ruleId}"`);
        }

        // Fail fast if duplicate supported rules are mapped across different active validators
        if (rulesUsed.has(ruleId)) {
          throw new Error(`Validator Registry Validation Error: Rule "${ruleId}" is claimed by multiple validators`);
        }
        rulesUsed.add(ruleId);
      }

      // 2. Validate dependencies exist
      for (const dep of def.dependencies) {
        if (!this.validators.has(dep)) {
          throw new Error(`Validator Registry Validation Error: Validator "${id}" has missing dependency "${dep}"`);
        }
      }
    }
  }

  public static reset() {
    this.validators.clear();
    this.initialized = false;
  }
}

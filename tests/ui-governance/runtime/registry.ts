import { RuntimeValidator } from './validator';

export class RuntimeRegistry {
  private static validators = new Map<string, RuntimeValidator>();

  public static register(validator: RuntimeValidator) {
    this.validators.set(validator.metadata.ruleId, validator);
  }

  public static getValidator(ruleId: string): RuntimeValidator | undefined {
    return this.validators.get(ruleId);
  }

  public static getValidatorsByTag(tag: string): RuntimeValidator[] {
    const list: RuntimeValidator[] = [];
    for (const validator of this.validators.values()) {
      if (validator.metadata.tags.includes(tag)) {
        list.push(validator);
      }
    }
    return list;
  }

  public static getAllValidators(): RuntimeValidator[] {
    return Array.from(this.validators.values());
  }
}

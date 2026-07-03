import { Fixer } from './fix_types';

export class FixRegistry {
  private static fixers = new Map<string, Fixer>();

  public static register(fixer: Fixer) {
    if (this.fixers.has(fixer.ruleId)) {
      throw new Error(`Duplicate fixer registration for rule: ${fixer.ruleId}`);
    }
    this.fixers.set(fixer.ruleId, fixer);
  }

  public static get(ruleId: string): Fixer | undefined {
    return this.fixers.get(ruleId);
  }

  public static getAll(): Fixer[] {
    return Array.from(this.fixers.values());
  }

  public static supports(ruleId: string): boolean {
    return this.fixers.has(ruleId);
  }

  public static registeredRuleIds(): string[] {
    return Array.from(this.fixers.keys()).sort();
  }

  public static registeredFixers(): readonly Fixer[] {
    return Array.from(this.fixers.values());
  }

  public static clear() {
    this.fixers.clear();
  }
}

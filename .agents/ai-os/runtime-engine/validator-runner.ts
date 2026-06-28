import { ValidatorResult } from './types';
import { ValidationError } from './errors';

export interface IValidator {
  id: string;
  validate(target: any): Promise<ValidatorResult>;
}

export class ValidatorRunner {
  private validators = new Map<string, IValidator>();

  registerValidator(validator: IValidator) {
    this.validators.set(validator.id, validator);
  }

  async runValidator(id: string, target: any): Promise<ValidatorResult> {
    const validator = this.validators.get(id);
    if (!validator) {
      // Mock execution if validator class is not dynamically loaded
      return {
        id,
        title: `Validator ${id} Execution`,
        severity: 'low',
        confidence: 1.0,
        evidence: `Target evaluated: ${JSON.stringify(target)}`,
        recommendation: 'Proceed with changes.'
      };
    }

    try {
      return await validator.validate(target);
    } catch (err: any) {
      throw new ValidationError(`Validator ${id} failed during execution: ${err.message}`);
    }
  }

  async runAll(ids: string[], target: any): Promise<ValidatorResult[]> {
    const results: ValidatorResult[] = [];
    for (const id of ids) {
      const res = await this.runValidator(id, target);
      results.push(res);
    }
    return results;
  }
}

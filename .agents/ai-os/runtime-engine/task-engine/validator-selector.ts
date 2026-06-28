import { TaskContext } from './types';

export class ValidatorSelector {
  selectValidators(context: TaskContext): string[] {
    return context.validators;
  }
}
export const validatorSelector = new ValidatorSelector();

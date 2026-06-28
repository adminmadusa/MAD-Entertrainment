import { IBaseValidator } from './validator';

export class ValidatorRegistry {
  private registry = new Map<string, IBaseValidator>();

  register(validator: IBaseValidator) {
    this.registry.set(validator.id, validator);
  }

  get(id: string): IBaseValidator | null {
    return this.registry.get(id) || null;
  }

  list(): IBaseValidator[] {
    return Array.from(this.registry.values());
  }

  clear() {
    this.registry.clear();
  }
}
export const validatorRegistry = new ValidatorRegistry();

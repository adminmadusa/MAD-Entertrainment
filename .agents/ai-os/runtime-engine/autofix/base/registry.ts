import { IFixer } from './fixer';

export class FixerRegistry {
  private fixers = new Map<string, IFixer>();

  register(fixer: IFixer) {
    this.fixers.set(fixer.id, fixer);
  }

  get(id: string): IFixer | null {
    return this.fixers.get(id) || null;
  }

  list(): IFixer[] {
    return Array.from(this.fixers.values());
  }

  clear() {
    this.fixers.clear();
  }
}
export const fixerRegistry = new FixerRegistry();

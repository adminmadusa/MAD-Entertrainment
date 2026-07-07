import { validatorRegistry } from './registry';
import { ExtendedValidatorResult } from './result';
import { DependencyResolver } from '../../dependency-resolver';

export class BaseValidatorRunner {
  private resolver = new DependencyResolver();

  async runValidators(
    ids: string[],
    repoRoot: string,
    filesList: string[]
  ): Promise<ExtendedValidatorResult[]> {
    const activeValidators = ids.map(id => validatorRegistry.get(id)).filter(Boolean);
    const validatorIds = activeValidators.map(v => v!.id);

    const depsMap = activeValidators.reduce((acc, v) => {
      acc[v!.id] = v!.dependencies;
      return acc;
    }, {} as Record<string, string[]>);

    const resolvedOrder = this.resolver.resolveTopologicalSort(validatorIds, depsMap);
    const results: ExtendedValidatorResult[] = [];

    for (const id of resolvedOrder) {
      const v = validatorRegistry.get(id);
      if (v) {
        const start = Date.now();
        const res = await v.execute(repoRoot, filesList);
        const durationMs = Date.now() - start;

        results.push({
          ...res,
          findings: (res as any).findings || [],
          durationMs
        });
      }
    }

    return results;
  }
}

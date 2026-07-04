import { DependencyError } from '../errors';

export class ModuleResolver {
  resolveModuleDependencies(moduleId: string, dependenciesMap: Record<string, string[]>): string[] {
    const deps = dependenciesMap[moduleId];
    if (!deps) {
      throw new DependencyError(`Failed to resolve module: "${moduleId}". Module not registered.`);
    }
    return deps;
  }
}

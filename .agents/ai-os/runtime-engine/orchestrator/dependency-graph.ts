import { DependencyResolver } from '../dependency-resolver';
import { DependencyError } from '../errors';

export interface ModuleNode {
  id: string;
  version: string;
  dependencies: string[];
}

export class DependencyGraph {
  private resolver = new DependencyResolver();

  buildAndSort(nodes: ModuleNode[]): string[] {
    const ids = nodes.map(n => n.id);

    // Verify duplicate registry IDs
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new DependencyError(`Duplicate registry ID detected: ${id}`);
      }
      seen.add(id);
    }

    const depsMap = nodes.reduce((acc, n) => {
      acc[n.id] = n.dependencies;
      return acc;
    }, {} as Record<string, string[]>);

    return this.resolver.resolveTopologicalSort(ids, depsMap);
  }
}

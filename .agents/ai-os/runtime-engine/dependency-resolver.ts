import { DependencyError } from './errors';

export class DependencyResolver {
  resolveTopologicalSort(nodes: string[], dependenciesMap: Record<string, string[]>): string[] {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];

    const visit = (node: string) => {
      if (tempVisited.has(node)) {
        throw new DependencyError(`Circular dependency cycle detected at: ${node}`);
      }
      if (!visited.has(node)) {
        tempVisited.add(node);
        const edges = dependenciesMap[node] || [];
        for (const edge of edges) {
          visit(edge);
        }
        tempVisited.delete(node);
        visited.add(node);
        sorted.push(node);
      }
    };

    for (const node of nodes) {
      visit(node);
    }

    return sorted;
  }
}

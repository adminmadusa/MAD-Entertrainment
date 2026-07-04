/**
 * RuleRegistry — Internal Platform Engine Component
 * @internal ADR-007
 *
 * Accepts GovernanceRule registrations, validates for duplicates, and
 * resolves execution order via topological sort of dependency declarations.
 *
 * Circular dependency detection occurs during resolveExecutionOrder(),
 * not during register(). If a cycle exists, CircularDependencyError is
 * thrown and execution is aborted before any rule runs.
 */
import type { GovernanceRule } from '../contracts/index';

export class DuplicateRuleError extends Error {
  constructor(id: string) {
    super(`Duplicate rule ID: "${id}". Each rule ID must be unique within the registry.`);
    this.name = 'DuplicateRuleError';
  }
}

export class CircularDependencyError extends Error {
  constructor(cycle: string[]) {
    super(`Circular dependency detected in rule graph: ${cycle.join(' → ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class MissingDependencyError extends Error {
  constructor(ruleId: string, missingDep: string) {
    super(`Rule "${ruleId}" declares dependency on "${missingDep}", which is not registered.`);
    this.name = 'MissingDependencyError';
  }
}

export class RuleRegistry {
  private readonly rules: Map<string, GovernanceRule> = new Map();

  /**
   * Register a GovernanceRule. Throws DuplicateRuleError if the rule ID
   * is already registered.
   */
  register(rule: GovernanceRule): void {
    if (this.rules.has(rule.metadata.id)) {
      throw new DuplicateRuleError(rule.metadata.id);
    }
    this.rules.set(rule.metadata.id, rule);
  }

  /**
   * Returns all registered rules in topological dependency order.
   *
   * Resolves the DAG using Kahn's algorithm (BFS-based topological sort).
   * Throws CircularDependencyError if a cycle is detected.
   * Throws MissingDependencyError if a declared dependency is not registered.
   */
  resolveExecutionOrder(): GovernanceRule[] {
    const allRules = [...this.rules.values()];

    // Validate all declared dependencies exist before sorting
    for (const rule of allRules) {
      for (const dep of rule.metadata.dependencies) {
        if (!this.rules.has(dep)) {
          throw new MissingDependencyError(rule.metadata.id, dep);
        }
      }
    }

    // Kahn's algorithm
    // Build in-degree map and adjacency list
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // dep → [rules that depend on it]

    for (const rule of allRules) {
      if (!inDegree.has(rule.metadata.id)) {
        inDegree.set(rule.metadata.id, 0);
      }
      if (!dependents.has(rule.metadata.id)) {
        dependents.set(rule.metadata.id, []);
      }
      for (const dep of rule.metadata.dependencies) {
        inDegree.set(rule.metadata.id, (inDegree.get(rule.metadata.id) ?? 0) + 1);
        const existing = dependents.get(dep) ?? [];
        existing.push(rule.metadata.id);
        dependents.set(dep, existing);
      }
    }

    // Start with rules that have no dependencies
    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    const ordered: GovernanceRule[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      ordered.push(this.rules.get(id)!);

      for (const dependent of dependents.get(id) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // If not all rules were processed, there is a cycle
    if (ordered.length !== allRules.length) {
      const remaining = allRules
        .filter(r => !ordered.find(o => o.metadata.id === r.metadata.id))
        .map(r => r.metadata.id);
      throw new CircularDependencyError(remaining);
    }

    return ordered;
  }

  /** Returns the count of registered rules. */
  get size(): number {
    return this.rules.size;
  }

  /** Returns true if a rule with the given ID is registered. */
  has(id: string): boolean {
    return this.rules.has(id);
  }
}

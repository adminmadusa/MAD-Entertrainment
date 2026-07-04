import { RuleRegistry } from '../rules/registry';
import { ValidatorRegistry, ValidatorDefinition } from './validator_registry';

export interface ExecutionPlan {
  orderedValidators: ValidatorDefinition[];
}

export class ExecutionPlanner {
  public static plan(filters?: {
    rules?: string[];
    categories?: string[];
    validators?: string[];
    owners?: string[];
    severities?: string[];
    enabledOnly?: boolean;
  }): ExecutionPlan {
    // 1. Get all registered validators
    const allDefs = ValidatorRegistry.getAllValidators();

    // 2. Filter based on configuration
    let enabledDefs = allDefs;
    if (filters?.enabledOnly !== false) {
      enabledDefs = allDefs.filter(def => def.enabled);
    }

    // Apply filters
    if (filters) {
      if (filters.validators && filters.validators.length > 0) {
        enabledDefs = enabledDefs.filter(def => filters.validators!.includes(def.id));
      }
      // If filtering by rule, category, owner, or severity, we filter down to validators that support those rules
      if (
        (filters.rules && filters.rules.length > 0) ||
        (filters.categories && filters.categories.length > 0) ||
        (filters.owners && filters.owners.length > 0) ||
        (filters.severities && filters.severities.length > 0)
      ) {
        enabledDefs = enabledDefs.filter(def => {
          return def.supportedRules.some(ruleId => {
            const rule = RuleRegistry.getRule(ruleId);
            if (!rule) return false;

            if (filters.rules && filters.rules.length > 0 && !filters.rules.includes(ruleId)) {
              return false;
            }
            if (filters.categories && filters.categories.length > 0 && !filters.categories.includes(rule.category)) {
              return false;
            }
            if (filters.owners && filters.owners.length > 0 && !filters.owners.includes(rule.owner)) {
              return false;
            }
            if (filters.severities && filters.severities.length > 0 && !filters.severities.includes(rule.severity)) {
              return false;
            }
            return true;
          });
        });
      }
    }

    // 3. Resolve dependencies and build topological sort order
    const ordered = this.topologicalSort(enabledDefs);

    return {
      orderedValidators: ordered,
    };
  }

  private static topologicalSort(validators: ValidatorDefinition[]): ValidatorDefinition[] {
    const sorted: ValidatorDefinition[] = [];
    const visited = new Map<string, 'visiting' | 'visited'>();

    // Map by ID for quick access
    const valMap = new Map<string, ValidatorDefinition>();
    for (const v of validators) {
      valMap.set(v.id, v);
    }

    const visit = (id: string) => {
      const state = visited.get(id);
      if (state === 'visiting') {
        throw new Error(`Execution Planner Error: Circular dependency detected involving validator "${id}"`);
      }
      if (state === 'visited') {
        return;
      }

      visited.set(id, 'visiting');

      const def = valMap.get(id);
      if (def) {
        // Visit all dependencies first
        for (const depId of def.dependencies) {
          // If the dependency is part of the plan, visit it
          if (valMap.has(depId)) {
            visit(depId);
          } else {
            // If dependency is not enabled or not filtered in, we still need to load it to satisfy prerequisites
            const fullDep = ValidatorRegistry.getValidator(depId);
            if (fullDep) {
              visit(depId);
            } else {
              throw new Error(`Execution Planner Error: Missing prerequisite dependency "${depId}" for validator "${id}"`);
            }
          }
        }

        visited.set(id, 'visited');
        // Add to sorted list if it is in the filtered list (or resolve dependency recursively)
        if (!sorted.some(s => s.id === id)) {
          sorted.push(def);
        }
      } else {
        // Prerequisite not in active filter, but exists in registry
        const fullDep = ValidatorRegistry.getValidator(id);
        if (fullDep) {
          for (const depId of fullDep.dependencies) {
            visit(depId);
          }
          visited.set(id, 'visited');
          if (!sorted.some(s => s.id === id)) {
            sorted.push(fullDep);
          }
        }
      }
    };

    // Sort by priority first to have stable initial order
    const sortedByPriority = [...validators].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

    for (const v of sortedByPriority) {
      visit(v.id);
    }

    return sorted;
  }
}

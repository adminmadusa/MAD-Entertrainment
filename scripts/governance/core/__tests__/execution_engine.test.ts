import { describe, it, expect, beforeEach } from 'vitest';
import { RuleRegistry } from '../../rules/registry';
import { ValidatorRegistry } from '../validator_registry';
import { ExecutionPlanner } from '../execution_planner';
import { ExecutionScheduler } from '../execution_scheduler';
import { ExecutionEngine } from '../execution_engine';
import { GovernanceValidator } from '../validator';
import { ValidationResult } from '../types';

class MockValidator implements GovernanceValidator {
  constructor(readonly name: string) {}
  async run(files: string[], metadata: any): Promise<ValidationResult> {
    return {
      name: this.name,
      success: true,
      executionTimeMs: 1,
      statistics: {},
      errors: [],
      warnings: [],
    };
  }
}

describe('Governance Rule Execution Engine', () => {
  beforeEach(() => {
    ExecutionEngine.reset();
    RuleRegistry.reset();
    RuleRegistry.initialize();
  });

  it('should initialize and register all standard validators successfully', () => {
    ExecutionEngine.initialize();
    const allValidators = ValidatorRegistry.getAllValidators();
    expect(allValidators.length).toBe(13);

    const markdownVal = ValidatorRegistry.getValidator('MarkdownValidator');
    expect(markdownVal).toBeDefined();
    expect(markdownVal?.supportedFileTypes).toContain('.md');
    expect(markdownVal?.priority).toBe(10);
  });

  it('should fail fast on duplicate validator registrations', () => {
    ExecutionEngine.initialize();
    expect(() => {
      ValidatorRegistry.registerValidator(new MockValidator('MarkdownValidator'), { id: 'MarkdownValidator' });
    }).toThrow(/Duplicate validator ID detected/);
  });

  it('should sort validators by priority during planning', () => {
    ExecutionEngine.initialize();
    const plan = ExecutionPlanner.plan();
    expect(plan.orderedValidators.length).toBe(13);

    // Verify ordering by priority
    const priorities = plan.orderedValidators.map(v => v.priority);
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorities[i]).toBeLessThanOrEqual(priorities[i + 1]);
    }
  });

  it('should plan execution using rule and category filters', () => {
    ExecutionEngine.initialize();
    const planByRule = ExecutionPlanner.plan({ rules: ['VAL-UI-007'] });
    expect(planByRule.orderedValidators.length).toBe(1);
    expect(planByRule.orderedValidators[0].id).toBe('UIDesignValidator');

    const planByCategory = ExecutionPlanner.plan({ categories: ['ACCESSIBILITY'] });
    expect(planByCategory.orderedValidators.length).toBe(1);
    expect(planByCategory.orderedValidators[0].id).toBe('AccessibilityValidator');
  });

  it('should detect circular dependencies and throw error during planning', () => {
    ValidatorRegistry.initialize();
    ValidatorRegistry.registerValidator(new MockValidator('ValA'), { id: 'ValA', dependencies: ['ValB'], priority: 1 });
    ValidatorRegistry.registerValidator(new MockValidator('ValB'), { id: 'ValB', dependencies: ['ValA'], priority: 2 });

    expect(() => {
      ExecutionPlanner.plan();
    }).toThrow(/Circular dependency detected/);
  });

  it('should resolve dependencies and sort them correctly', () => {
    ValidatorRegistry.initialize();
    // Register ValA, which depends on ValB. ValB should run before ValA.
    ValidatorRegistry.registerValidator(new MockValidator('ValA'), { id: 'ValA', dependencies: ['ValB'], priority: 10 });
    ValidatorRegistry.registerValidator(new MockValidator('ValB'), { id: 'ValB', dependencies: [], priority: 20 });

    const plan = ExecutionPlanner.plan();
    const order = plan.orderedValidators.map(v => v.id);
    expect(order.indexOf('ValB')).toBeLessThan(order.indexOf('ValA'));
  });

  it('should collect execution metrics and report outcomes', async () => {
    ExecutionEngine.initialize();
    const report = await ExecutionEngine.execute([], {});
    expect(report.results.length).toBe(13);
    expect(report.metrics.length).toBe(13);
    expect(report.totalExecutionTimeMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics.every(m => m.filesProcessed === 0)).toBe(true);
  });

  it('should reject duplicate priorities if explicitly configured', () => {
    ValidatorRegistry.initialize();
    ValidatorRegistry.registerValidator(new MockValidator('ValA'), { id: 'ValA', priority: 10 });
    ValidatorRegistry.registerValidator(new MockValidator('ValB'), { id: 'ValB', priority: 10 });

    expect(() => {
      ValidatorRegistry.validateRegistry();
      const priorities = new Set<number>();
      for (const val of ValidatorRegistry.getAllValidators()) {
        if (priorities.has(val.priority)) {
          throw new Error(`Duplicate priority: ${val.priority}`);
        }
        priorities.add(val.priority);
      }
    }).toThrow(/Duplicate priority/);
  });
});

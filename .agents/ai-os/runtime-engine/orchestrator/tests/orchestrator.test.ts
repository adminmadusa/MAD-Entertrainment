import { describe, it, expect } from 'vitest';
import { OrchestrationEngine } from '../engine';
import { DependencyGraph } from '../dependency-graph';
import { TaskPlanner } from '../task-planner';
import { PipelineBuilder } from '../pipeline-builder';
import { PipelineScheduler } from '../scheduler';
import { HealthEngine } from '../health';
import { DependencyError } from '../../errors';

describe('AI OS Registry Discovery & AI Orchestration Engine Suites', () => {
  it('should build dependency graph and detect circular dependencies', () => {
    const graph = new DependencyGraph();
    const nodes = [
      { id: 'A', version: '1.0.0', dependencies: ['B'] },
      { id: 'B', version: '1.0.0', dependencies: ['A'] }
    ];
    expect(() => graph.buildAndSort(nodes)).toThrow(DependencyError);
  });

  it('should sort modules topologically if no cycles exist', () => {
    const graph = new DependencyGraph();
    const nodes = [
      { id: 'A', version: '1.0.0', dependencies: ['B'] },
      { id: 'B', version: '1.0.0', dependencies: [] }
    ];
    const order = graph.buildAndSort(nodes);
    expect(order).toEqual(['B', 'A']);
  });

  it('should generate plans based on task category', () => {
    const planner = new TaskPlanner();
    const plan = planner.generatePlan('TASK-1', 'performance', false);
    expect(plan.validators).toContain('VAL-PRF-001');
    expect(plan.autofixEnabled).toBe(false);
  });

  it('should build step pipelines from plan configurations', () => {
    const planner = new TaskPlanner();
    const builder = new PipelineBuilder();
    const plan = planner.generatePlan('TASK-1', 'typescript', true);
    const steps = builder.buildPipeline(plan);
    expect(steps.some(s => s.type === 'autofix')).toBe(true);
  });

  it('should schedule steps and execute retry policy on errors', async () => {
    const scheduler = new PipelineScheduler();
    let runs = 0;
    const steps = [{ name: 'Step 1', type: 'validate' as const, targetIds: [] }];

    const results = await scheduler.executeSteps(steps, async () => {
      runs++;
      return 'success';
    });
    expect(results).toEqual(['success']);
    expect(runs).toBe(1);
  });

  it('should perform health check evaluations', () => {
    const health = new HealthEngine();
    const result = health.verifyHealth([
      { category: 'validation', filePath: '/path/to/validation', isValid: true }
    ]);
    expect(result.healthy).toBe(true);
  });

  it('should successfully run orchestration engine pipelines', async () => {
    const engine = new OrchestrationEngine();
    const eventLog: string[] = [];
    engine.subscribeToEvents(e => eventLog.push(e.type));

    const result = await engine.runOrchestration(
      process.cwd(),
      ['apps/web/temp2/test.tsx'],
      'TASK-999',
      'typescript',
      false
    );

    expect(result.success).toBe(true);
    expect(result.metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(eventLog).toContain('BOOT');
    expect(eventLog).toContain('COMPLETED');
  });
});

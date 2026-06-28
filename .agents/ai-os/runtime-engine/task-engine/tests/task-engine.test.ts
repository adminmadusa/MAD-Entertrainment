import { describe, it, expect } from 'vitest';
import { TaskExecutionEngine } from '../engine';
import { IntentDetector } from '../intent-detector';
import { ContextResolver } from '../context-resolver';
import { ExecutionPlanner } from '../execution-planner';
import { WorkflowBuilder } from '../workflow-builder';

describe('AI OS Task Execution Engine Suites', () => {
  it('should detect intents and alternatives from request query', () => {
    const detector = new IntentDetector();
    const result = detector.detectIntent('Audit booking endpoints and check options');
    expect(result.intent).toBe('audit');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.matchedKeywords).toContain('audit');
    expect(result.alternatives).toBeDefined();
  });

  it('should resolve context layers and selected properties', () => {
    const resolver = new ContextResolver();
    const intent = {
      intent: 'audit',
      confidence: 0.99,
      matchedKeywords: ['audit'],
      alternatives: []
    };
    const context = resolver.resolveContext(process.cwd(), 'TASK-101', 'Audit files', intent, 'VALIDATE');
    expect(context.mode).toBe('VALIDATE');
    expect(context.selectedValidators).toContain('VAL-NAM-001');
  });

  it('should generate an immutable versioned explainable execution plan', () => {
    const planner = new ExecutionPlanner();
    const intent = {
      intent: 'audit',
      confidence: 0.99,
      matchedKeywords: ['audit'],
      alternatives: []
    };
    const context = {
      repoRoot: process.cwd(),
      taskId: 'TASK-101',
      request: 'Audit files',
      mode: 'VALIDATE' as const,
      selectedValidators: ['VAL-NAM-001'],
      selectedSkills: [],
      selectedPrompts: [],
      selectedTemplates: []
    };

    const plan = planner.generatePlan(intent, context, 'VALIDATE');
    expect(plan.planId).toBeDefined();
    expect(plan.version).toBe('1.0.0');
    expect(plan.generatedAt).toBeDefined();
    expect(plan.explanation.detectedIntent).toBe('audit');

    // Test immutability
    expect(() => {
      (plan as any).version = '2.0.0';
    }).toThrow();
  });

  it('should sort DAG nodes topologically', () => {
    const builder = new WorkflowBuilder();
    const graph = {
      nodes: [
        { id: 'B', type: 'validate' as const, dependencies: ['A'], parallelizable: true },
        { id: 'A', type: 'validate' as const, dependencies: [], parallelizable: false }
      ]
    };
    const sorted = builder.buildWorkflow(graph);
    expect(sorted[0].id).toBe('A');
    expect(sorted[1].id).toBe('B');
  });

  it('should plan and execute task via public API', async () => {
    const engine = new TaskExecutionEngine();
    const plan = await engine.planTask(
      process.cwd(),
      'TASK-888',
      'Audit naming conventions',
      'VALIDATE'
    );

    expect(plan.context.taskId).toBe('TASK-888');

    const result = await engine.executeTask(plan, ['apps/web/temp2/test.tsx']);
    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

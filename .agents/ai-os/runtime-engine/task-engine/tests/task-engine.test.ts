import { describe, it, expect } from 'vitest';
import { TaskExecutionEngine } from '../engine';
import { IntentDetector } from '../intent-detector';
import { ContextResolver } from '../context-resolver';
import { ExecutionPlanner } from '../execution-planner';

describe('AI OS Task Execution Engine Suites', () => {
  it('should detect intents and targets from query requests', () => {
    const detector = new IntentDetector();
    const result = detector.detectIntent('Audit booking endpoints');
    expect(result.intent).toBe('audit');
    expect(result.target).toBe('bookings');
  });

  it('should resolve compatibility layers context based on intent', () => {
    const resolver = new ContextResolver();
    const intent = { intent: 'audit' as const, target: 'authentication', confidence: 1.0 };
    const context = resolver.resolveContext(intent);
    expect(context.layers).toContain('architecture');
  });

  it('should formulate plan graph nodes in order', () => {
    const planner = new ExecutionPlanner();
    const intent = { intent: 'audit' as const, target: 'authentication', confidence: 1.0 };
    const context = { layers: [], validators: [], skills: [], prompt: '', template: '' };
    const graph = planner.planGraph(intent, context);
    expect(graph.length).toBe(4);
    expect(graph[0].name).toBe('Load Context');
  });

  it('should run task execution pipelines successfully', async () => {
    const engine = new TaskExecutionEngine();
    const eventsLog: string[] = [];
    engine.subscribeToEvents(e => eventsLog.push(e.type));

    const result = await engine.executeTask(
      process.cwd(),
      ['apps/web/temp2/test.tsx'],
      'TASK-777',
      'Audit authentication config key options',
      true
    );

    expect(result.success).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(0);
    expect(result.revalidationFindings).toBeDefined();
    expect(eventsLog).toContain('TASK_STARTED');
    expect(eventsLog).toContain('TASK_COMPLETED');
  });
});

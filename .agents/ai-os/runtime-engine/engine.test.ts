import { describe, it, expect } from 'vitest';
import { RuntimeEngine } from './engine';
import { DependencyResolver } from './dependency-resolver';
import { ContextLoader } from './context-loader';
import { TemplateRenderer } from './template-renderer';
import { StructuredLogger } from './logger';
import { DependencyError, ValidationError } from './errors';

describe('AI OS Runtime Engine Core Suites', () => {
  it('should successfully boot the runtime engine', async () => {
    const engine = new RuntimeEngine();
    await expect(engine.boot()).resolves.not.toThrow();
    expect(engine.getState()).toBe('Idle');
  });

  it('should detect cycles and throw DependencyError', () => {
    const resolver = new DependencyResolver();
    const nodes = ['A', 'B'];
    const deps = {
      A: ['B'],
      B: ['A']
    };
    expect(() => resolver.resolveTopologicalSort(nodes, deps)).toThrow(DependencyError);
  });

  it('should resolve acyclic dependencies topologically', () => {
    const resolver = new DependencyResolver();
    const nodes = ['A', 'B', 'C'];
    const deps = {
      A: ['B'],
      B: ['C'],
      C: []
    };
    const sorted = resolver.resolveTopologicalSort(nodes, deps);
    expect(sorted).toEqual(['C', 'B', 'A']);
  });

  it('should load environment contexts dynamically', async () => {
    const loader = new ContextLoader();
    const ctx = await loader.loadContext();
    expect(ctx.repoRoot).toBeDefined();
    expect(ctx.activeSkills.length).toBeGreaterThan(0);
  });

  it('should render JSON and Markdown formats successfully', async () => {
    const renderer = new TemplateRenderer();
    const data = { name: 'Audit', result: 'Success' };

    const jsonOut = await renderer.render('Template', data, 'json');
    expect(jsonOut).toContain('Audit');

    const mdOut = await renderer.render('Result: {{result}}', data, 'markdown');
    expect(mdOut).toBe('Result: Success');
  });

  it('should register logs into structured entries list', () => {
    const logger = new StructuredLogger();
    logger.info('Executing', 'Test', 'Log message');
    const logs = logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Log message');
  });

  it('should execute tasks and produce standardized AuditReports', async () => {
    const engine = new RuntimeEngine();
    const report = await engine.runTask({
      taskId: 'TASK-101',
      taskName: 'Repository Check',
      workspacePath: process.cwd(),
      options: { branchName: 'feat/ticket-dashboard' }
    });
    expect(report.metadata.taskId).toBe('TASK-101');
    expect(report.summary.success).toBe(true);
  });
});

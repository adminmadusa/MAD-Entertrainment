import { ORCHESTRATOR_STATES, OrchestratorState } from './state';
import { OrchestratorEventEmitter } from './events';
import { MetricsCollector, OrchestratorMetrics } from './metrics';
import { RegistryDiscovery } from './registry-discovery';
import { HealthEngine } from './health';
import { TaskPlanner } from './task-planner';
import { PipelineBuilder } from './pipeline-builder';
import { PipelineScheduler } from './scheduler';
import { PipelineExecutor } from './executor';

export class OrchestrationEngine {
  private state: OrchestratorState = ORCHESTRATOR_STATES.IDLE;
  private events = new OrchestratorEventEmitter();
  private metrics = new MetricsCollector();
  private discovery = new RegistryDiscovery();
  private health = new HealthEngine();
  private planner = new TaskPlanner();
  private builder = new PipelineBuilder();
  private scheduler = new PipelineScheduler();
  private executor = new PipelineExecutor();

  subscribeToEvents(listener: (event: any) => void) {
    this.events.subscribe(listener);
  }

  async runOrchestration(
    repoRoot: string,
    filesList: string[],
    taskId: string,
    category: string,
    autofixEnabled: boolean
  ): Promise<{ success: boolean; metrics: OrchestratorMetrics; results: any[] }> {
    this.state = ORCHESTRATOR_STATES.BOOTING as any;
    this.events.emit('BOOT', 'Orchestrator Boot started.');
    this.metrics.start();

    try {
      // 1. Discovery
      this.state = ORCHESTRATOR_STATES.DISCOVERY;
      this.events.emit('DISCOVERY', 'Discovering registered registries...');
      const discovered = this.discovery.discoverRegistries(repoRoot);
      const healthCheck = this.health.verifyHealth(discovered);
      if (!healthCheck.healthy) {
        throw new Error(`Health validation failed: ${healthCheck.issues.join(', ')}`);
      }

      // 2. Planning
      this.state = ORCHESTRATOR_STATES.PLANNING;
      const plan = this.planner.generatePlan(taskId, category, autofixEnabled);

      // 3. Pipeline Build
      this.state = ORCHESTRATOR_STATES.PIPELINE_BUILD;
      const pipeline = this.builder.buildPipeline(plan);
      this.events.emit('PIPELINE_CREATED', 'Execution pipeline built successfully.');

      // 4. Execution
      this.state = ORCHESTRATOR_STATES.EXECUTION;
      this.events.emit('VALIDATION_STARTED', 'Executing validation pipeline...');
      const results = await this.scheduler.executeSteps(pipeline, step =>
        this.executor.executeStep(repoRoot, filesList, step)
      );

      this.state = ORCHESTRATOR_STATES.COMPLETED;
      this.events.emit('COMPLETED', 'Orchestration completed successfully.');

      const metrics = this.metrics.collect(plan.validators.length, autofixEnabled ? plan.validators.length : 0);
      return { success: true, metrics, results };
    } catch (err: any) {
      this.state = ORCHESTRATOR_STATES.FAILED;
      this.events.emit('ERROR', `Orchestrator execution failed: ${err.message}`);
      throw err;
    }
  }

  getState(): OrchestratorState {
    return this.state;
  }
}

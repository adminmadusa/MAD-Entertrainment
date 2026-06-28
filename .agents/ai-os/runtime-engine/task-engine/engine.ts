import { TASK_STATES, TaskState } from './task-state';
import { TaskEngineEventEmitter } from './events';
import { TaskMetricsCollector } from './metrics';
import { intentDetector } from './intent-detector';
import { contextResolver } from './context-resolver';
import { executionPlanner } from './execution-planner';
import { workflowBuilder } from './workflow-builder';
import { pipelineRunner } from './pipeline-runner';
import { revalidationRunner } from './revalidation';
import { reportController } from './report-controller';
import { TaskExecutionResult } from './types';
import { PipelineBuilder } from '../orchestrator/pipeline-builder';
import { ReportGenerator } from '../report-generator';

export class TaskExecutionEngine {
  private state: TaskState = TASK_STATES.IDLE;
  private events = new TaskEngineEventEmitter();
  private metrics = new TaskMetricsCollector();
  private pipelineBuilder = new PipelineBuilder();
  private reportGenerator = new ReportGenerator();

  subscribeToEvents(listener: (event: any) => void) {
    this.events.subscribe(listener);
  }

  async executeTask(
    repoRoot: string,
    filesList: string[],
    taskId: string,
    request: string,
    autofixEnabled = false
  ): Promise<TaskExecutionResult> {
    const startMs = Date.now();
    this.state = TASK_STATES.INTENT_DETECTION;
    this.events.emit('TASK_STARTED', 'Task execution initiated.');
    this.metrics.start();

    try {
      // 1. Intent Detection
      const intent = intentDetector.detectIntent(request);
      this.events.emit('INTENT_DETECTED', `Intent detected: ${intent.intent}`, { intent });

      // 2. Context Resolution
      this.state = TASK_STATES.CONTEXT_RESOLUTION;
      const context = contextResolver.resolveContext(intent);
      this.events.emit('CONTEXT_RESOLVED', 'Context resolved successfully.', { context });

      // 3. Planning
      this.state = TASK_STATES.PLANNING;
      const planGraph = executionPlanner.planGraph(intent, context);
      const workflow = workflowBuilder.buildWorkflow(planGraph);
      this.events.emit('PLAN_CREATED', 'Execution workflow planner finalized.');

      // 4. Execution & Validation
      this.state = TASK_STATES.EXECUTION;
      const pipelineSteps = this.pipelineBuilder.buildPipeline({
        taskId,
        validators: context.validators,
        skills: context.skills,
        prompt: context.prompt,
        template: context.template,
        autofixEnabled
      });

      this.events.emit('STEP_STARTED', 'Executing pipeline steps...');
      const stepResults = await pipelineRunner.executePipeline(repoRoot, filesList, pipelineSteps);
      this.events.emit('STEP_COMPLETED', 'Pipeline steps executed.');

      // Compiles findings
      const validationStep = stepResults.find(s => s.stepName === 'Validate target states');
      const findings = validationStep ? (validationStep.results || []).flatMap((r: any) => r.findings || []) : [];

      // 5. Revalidation
      let revalidationFindings = undefined;
      if (autofixEnabled) {
        this.state = TASK_STATES.REVALIDATION;
        const revalResults = await revalidationRunner.revalidate(repoRoot, filesList, context.validators);
        revalidationFindings = revalResults.flatMap(r => r.findings || []);
      }

      // 6. Reporting
      this.state = TASK_STATES.REPORTING;
      const durationMs = Date.now() - startMs;
      const report = this.reportGenerator.generateAuditReport(
        `sess_task_${taskId}`,
        taskId,
        durationMs,
        findings
      );

      const reportPath = await reportController.writeReport(repoRoot, report, 'task-engine');

      this.state = TASK_STATES.COMPLETED;
      this.events.emit('TASK_COMPLETED', 'Task execution finished successfully.');

      return {
        success: true,
        intent,
        context,
        steps: stepResults,
        findings,
        revalidationFindings,
        reportPath,
        durationMs
      };
    } catch (err: any) {
      this.state = TASK_STATES.FAILED;
      this.events.emit('TASK_FAILED', `Task execution failed: ${err.message}`);
      throw err;
    }
  }

  getState(): TaskState {
    return this.state;
  }
}

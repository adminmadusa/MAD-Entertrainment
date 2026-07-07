import { TASK_STATES, TaskState } from './task-state';
import { TaskEngineEventEmitter } from './events';
import { taskMetricsCollector } from './metrics';
import { intentDetector } from './intent-detector';
import { contextResolver } from './context-resolver';
import { executionPlanner } from './execution-planner';
import { workflowBuilder } from './workflow-builder';
import { pipelineRunner } from './pipeline-runner';
import { revalidationRunner } from './revalidation';
import { reportController } from './report-controller';
import { ExecutionPlan, TaskExecutionResult, ExecutionMode } from './types';
import { PipelineBuilder } from '../orchestrator/pipeline-builder';
import { ReportGenerator } from '../report-generator';

export class TaskExecutionEngine {
  private state: TaskState = TASK_STATES.IDLE;
  private events = new TaskEngineEventEmitter();
  private pipelineBuilder = new PipelineBuilder();
  private reportGenerator = new ReportGenerator();

  subscribeToEvents(listener: (event: any) => void) {
    this.events.subscribe(listener);
  }

  async planTask(
    repoRoot: string,
    taskId: string,
    request: string,
    mode: ExecutionMode
  ): Promise<ExecutionPlan> {
    this.state = TASK_STATES.INTENT_DETECTION;
    this.events.emit('TASK_STARTED', 'Task planning initiated.');

    const intent = intentDetector.detectIntent(request);
    this.events.emit('INTENT_DETECTED', `Intent detected: ${intent.intent}`, { intent });

    this.state = TASK_STATES.CONTEXT_RESOLUTION;
    const context = contextResolver.resolveContext(repoRoot, taskId, request, intent, mode);
    this.events.emit('CONTEXT_RESOLVED', 'Context resolved successfully.', { context });

    this.state = TASK_STATES.PLANNING;
    const plan = executionPlanner.generatePlan(intent, context, mode);
    this.events.emit('PLAN_CREATED', 'Execution plan built successfully.', { plan });

    return plan;
  }

  async executeTask(
    plan: ExecutionPlan,
    filesList: string[]
  ): Promise<TaskExecutionResult> {
    const startMs = Date.now();
    this.state = TASK_STATES.EXECUTION;
    this.events.emit('STEP_STARTED', 'Starting execution workflow...');
    taskMetricsCollector.start();

    try {
      const autofixEnabled = plan.executionMode === 'FIX';
      const pipelineSteps = this.pipelineBuilder.buildPipeline({
        taskId: plan.context.taskId,
        validators: plan.context.selectedValidators,
        skills: plan.context.selectedSkills,
        prompt: plan.context.selectedPrompts[0] || '',
        template: plan.context.selectedTemplates[0] || '',
        autofixEnabled
      });

      const stepResults = await pipelineRunner.executePipeline(
        plan.context.repoRoot,
        filesList,
        pipelineSteps
      );
      this.events.emit('STEP_COMPLETED', 'Execution steps completed.');

      // Extract findings
      const validationStep = stepResults.find(s => s.stepName === 'Validate target states');
      const findings = validationStep ? (validationStep.results || []).flatMap((r: any) => r.findings || []) : [];

      let revalidationFindings = undefined;
      if (autofixEnabled) {
        this.state = TASK_STATES.REVALIDATION;
        const revalResults = await revalidationRunner.revalidate(
          plan.context.repoRoot,
          filesList,
          plan.context.selectedValidators
        );
        revalidationFindings = revalResults.flatMap(r => r.findings || []);
      }

      this.state = TASK_STATES.REPORTING;
      const durationMs = Date.now() - startMs;
      const report = this.reportGenerator.generateAuditReport(
        `sess_task_${plan.planId}`,
        plan.context.taskId,
        durationMs,
        findings
      );

      const reportPath = await reportController.writeReport(
        plan.context.repoRoot,
        report,
        'task-engine'
      );

      this.state = TASK_STATES.COMPLETED;
      this.events.emit('TASK_COMPLETED', 'Task execution finished successfully.');

      return {
        success: true,
        plan,
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

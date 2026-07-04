import { ENGINE_STATES, EngineState } from './constants';
import { TaskConfig, EngineContext, ValidatorResult, AuditReport } from './types';
import { StructuredLogger } from './logger';
import { CacheManager } from './cache-manager';
import { SessionManager } from './session-manager';
import { ContextLoader } from './context-loader';
import { RegistryLoader } from './registry-loader';
import { DependencyResolver } from './dependency-resolver';
import { ValidatorRunner } from './validator-runner';
import { SkillRunner } from './skill-runner';
import { PromptRunner } from './prompt-runner';
import { TemplateRenderer } from './template-renderer';
import { ReportGenerator } from './report-generator';
import { Bootstrapper } from './boot';
import { RuntimeEngineError } from './errors';

export class RuntimeEngine {
  private state: EngineState = ENGINE_STATES.IDLE;
  private logger = new StructuredLogger();
  private cache = new CacheManager();
  private session = new SessionManager();
  private bootstrapper = new Bootstrapper();
  private contextLoader = new ContextLoader();
  private registryLoader = new RegistryLoader();
  private resolver = new DependencyResolver();
  private validatorRunner = new ValidatorRunner();
  private skillRunner = new SkillRunner();
  private promptRunner = new PromptRunner();
  private renderer = new TemplateRenderer();
  private reportGenerator = new ReportGenerator();

  private context: EngineContext | null = null;

  getState(): EngineState {
    return this.state;
  }

  getLogs() {
    return this.logger.getLogs();
  }

  async boot(startPath: string = process.cwd()): Promise<void> {
    this.state = ENGINE_STATES.BOOTING;
    this.logger.info('Booting', 'RuntimeEngine', 'Initiating Runtime Engine startup sequence...');

    try {
      const startTime = Date.now();
      this.context = await this.contextLoader.loadContext(startPath);
      const loadedTiers = await this.bootstrapper.boot(this.context.repoRoot);
      this.logger.info(
        'Booting',
        'RuntimeEngine',
        `Startup booted successfully. Loaded tiers: ${loadedTiers.join(', ')}`,
        Date.now() - startTime
      );
      this.state = ENGINE_STATES.IDLE;
    } catch (err: any) {
      this.state = ENGINE_STATES.FAILED;
      this.logger.error('Booting', 'RuntimeEngine', `Startup sequence failed: ${err.message}`);
      throw err;
    }
  }

  async runTask(config: TaskConfig): Promise<AuditReport> {
    if (this.state === ENGINE_STATES.BOOTING) {
      throw new RuntimeEngineError('Engine is booting. Task execution blocked.', 'Booting');
    }

    const session = this.session.startSession(config.taskId);
    this.logger.info('Executing', 'RuntimeEngine', `Task Execution started for task: ${config.taskId}`);

    try {
      if (!this.context) {
        await this.boot(config.workspacePath);
      }

      const repoRoot = this.context!.repoRoot;

      // 1. Loading
      this.session.updateState(ENGINE_STATES.LOADING);
      const validatorsList = await this.registryLoader.loadRegistry(repoRoot, 'validation');
      this.session.trackModuleLoad('validation');

      // 2. Resolving
      this.session.updateState(ENGINE_STATES.RESOLVING);
      const validatorIds = validatorsList.map(v => v.id);
      const depsMap = validatorsList.reduce((acc, v) => {
        acc[v.id] = v.dependencies;
        return acc;
      }, {} as Record<string, string[]>);

      const resolvedValidators = this.resolver.resolveTopologicalSort(validatorIds, depsMap);

      // 3. Validating
      this.session.updateState(ENGINE_STATES.VALIDATING);
      const targetData = config.options || {};
      const results: ValidatorResult[] = [];
      for (const valId of resolvedValidators) {
        this.session.trackValidatorExecute(valId);
        const res = await this.validatorRunner.runValidator(valId, targetData);
        results.push(res);
      }

      // 4. Reporting
      this.session.updateState(ENGINE_STATES.REPORTING);
      const durationMs = Date.now() - session.startTime;
      const report = this.reportGenerator.generateAuditReport(session.sessionId, config.taskId, durationMs, results);
      await this.reportGenerator.persistReport(repoRoot, report, 'audit');

      this.session.endSession('Completed');
      this.state = ENGINE_STATES.COMPLETED;
      return report;
    } catch (err: any) {
      this.session.endSession('Failed');
      this.state = ENGINE_STATES.FAILED;
      this.logger.error('Executing', 'RuntimeEngine', `Task Execution failed: ${err.message}`);
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Idle', 'RuntimeEngine', 'Shutting down Runtime Engine...');
    await this.cache.clear();
    this.state = ENGINE_STATES.IDLE;
  }
}

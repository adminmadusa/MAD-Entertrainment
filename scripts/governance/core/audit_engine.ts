// scripts/governance/core/audit_engine.ts
import { existsSync, readdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { FindingManager } from './finding_manager';
import { LifecycleManager } from './lifecycle_manager';
import { KnowledgeGraph } from './knowledge_graph';
import { MetricsEngine } from './metrics_engine';
import { ReportEngine } from './report_engine';
import { GatingAction, ConfidenceEngine } from './confidence_engine';
import { Finding, StatelessViolation, RepositorySnapshot } from './types';

export class AuditEngine {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static pluginsDir = resolve(AuditEngine.workspaceRoot, 'scripts/governance/plugins');

  private findingManager: FindingManager;
  private lifecycleManager: LifecycleManager;
  private knowledgeGraph: KnowledgeGraph | null = null;
  private reportEngine: ReportEngine;

  constructor() {
    this.findingManager = new FindingManager();
    this.lifecycleManager = new LifecycleManager(this.findingManager);
    this.reportEngine = new ReportEngine();
  }

  /**
   * Initializes the knowledge graph (only when doing incremental/PR audits).
   */
  public getKnowledgeGraph(): KnowledgeGraph {
    if (!this.knowledgeGraph) {
      this.knowledgeGraph = new KnowledgeGraph();
    }
    return this.knowledgeGraph;
  }

  /**
   * Main audit pipeline execution.
   */
  public execute(
    rawViolations: StatelessViolation[],
    options: {
      isIncremental?: boolean;
      changedFiles?: string[];
      commitSha?: string;
      branchName?: string;
      validatorTimeMs?: number;
      astTimeMs?: number;
    } = {}
  ): {
    success: boolean;
    findings: Finding[];
    gatingAction: GatingAction;
  } {
    const globalStart = Date.now();
    const activeFindingIds = new Set<string>();

    // 1. Process violations through FindingManager
    console.log(`🧠 Matching ${rawViolations.length} stateless violations...`);
    for (const violation of rawViolations) {
      const finding = this.findingManager.matchOrCreateFinding(violation);
      activeFindingIds.add(finding.id);
    }

    // 2. Reconcile statuses (resolve resolved findings, tag regressions)
    console.log('🔄 Reconciling finding lifecycle states...');
    this.lifecycleManager.reconcile(activeFindingIds);

    // 3. Load and run governance plugins (if any exist)
    this.executePlugins(rawViolations);

    // 4. Capture Repository Snapshot
    const commit = options.commitSha || 'unknown';
    const branch = options.branchName || 'unknown';
    this.saveSnapshot({
      commit,
      branch,
      timestamp: new Date().toISOString(),
      engineVersion: '1.0.0',
      ruleRegistryVersion: '1.0.0',
    });

    // 5. Calculate Metrics
    const allFindings = this.findingManager.getAllFindings();
    console.log('📊 Calculating governance scorecard metrics...');
    const metrics = MetricsEngine.calculate(allFindings);

    // 6. Resolve PR scope if incremental
    let prAffectedFiles = new Set<string>();
    if (options.isIncremental && options.changedFiles) {
      const graph = this.getKnowledgeGraph();
      prAffectedFiles = graph.getAffectedConsumers(options.changedFiles);
      console.log(`🎯 PR Impact scope resolved to ${prAffectedFiles.size} downstream consumers.`);
    }

    // 7. Generate Reports
    console.log('📝 Generating governance markdown reports...');
    this.reportEngine.generateGovernanceReport(allFindings, metrics);
    this.reportEngine.generateRegressionReport(allFindings);
    this.reportEngine.generateTechDebtReport(allFindings);

    if (options.isIncremental && prAffectedFiles.size > 0) {
      this.reportEngine.generatePRReport(allFindings, prAffectedFiles);
    }

    // 8. Determine Gating & Build Failures
    // Check if any active violation in scope triggers FAIL_BUILD
    let finalGating: GatingAction = 'INFO_ONLY';
    const activeFindings = allFindings.filter(
      f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION'
    );

    // Scope check: If PR-scoped audit, only evaluate gating on affected files
    const gatingCandidates = options.isIncremental
      ? activeFindings.filter(f => prAffectedFiles.has(f.evidence.path))
      : activeFindings;

    for (const finding of gatingCandidates) {
      const action = ConfidenceEngine.evaluate(finding);
      if (action === 'FAIL_BUILD') {
        finalGating = 'FAIL_BUILD';
      } else if (action === 'WARN' && finalGating !== 'FAIL_BUILD') {
        finalGating = 'WARN';
      } else if (action === 'MANUAL_REVIEW_REQUIRED' && finalGating === 'INFO_ONLY') {
        finalGating = 'MANUAL_REVIEW_REQUIRED';
      }
    }

    // 9. Monitor Performance
    const totalDuration = Date.now() - globalStart;
    MetricsEngine.monitorPerformance({
      totalScanDurationMs: totalDuration,
      astParsingTimeMs: options.astTimeMs || 0,
      dependencyGraphBuildTimeMs: totalDuration - (options.validatorTimeMs || 0),
      validatorExecutionTimeMs: options.validatorTimeMs || 0,
      reportGenerationTimeMs: 15, // estimated
      memoryUsageBytes: process.memoryUsage().heapUsed,
    });

    return {
      success: finalGating !== 'FAIL_BUILD',
      findings: allFindings,
      gatingAction: finalGating,
    };
  }

  private saveSnapshot(snapshot: RepositorySnapshot) {
    const snapshotPath = join(
      AuditEngine.workspaceRoot,
      '.governance/baselines',
      `snapshot-${new Date().toISOString().substring(0, 7)}.json`
    );
    try {
      writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (e) {
      // Ignore write errors for baseline snapshot
    }
  }

  private executePlugins(violations: StatelessViolation[]) {
    if (!existsSync(AuditEngine.pluginsDir)) return;
    try {
      const files = readdirSync(AuditEngine.pluginsDir);
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const plugin = require(join(AuditEngine.pluginsDir, file));
          if (typeof plugin.run === 'function') {
            plugin.run(violations);
          }
        }
      }
    } catch (e) {
      // Ignore plugin execution failures
    }
  }
}
export const auditEngineVersion = '1.0.0';

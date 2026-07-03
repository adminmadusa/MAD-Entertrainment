// scripts/governance/core/audit_engine.ts
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { FindingManager } from './finding_manager';
import { LifecycleManager } from './lifecycle_manager';
import { KnowledgeGraph } from './knowledge_graph';
import { MetricsEngine } from './metrics_engine';
import { ReportEngine } from './report_engine';
import { GatingAction, ConfidenceEngine } from './confidence_engine';
import { Finding, StatelessViolation, RepositorySnapshot } from './types';
import { writeJsonIfChanged, persistenceStats } from './json_utils';
import { SessionStore } from './session_store';
import { RollbackHistory } from './rollback_history';
import { AnalyticsEngine } from './analytics_engine';
import { AnalyticsStore } from './analytics_store';
import { FixRegistry } from './fix_registry';

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
      scannedFiles?: string[];
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
    const claimedFindingIds = new Set<string>();
    for (const violation of rawViolations) {
      const finding = this.findingManager.matchOrCreateFinding(violation, claimedFindingIds);
      claimedFindingIds.add(finding.id);
      activeFindingIds.add(finding.id);
    }

    // 2. Reconcile statuses (resolve resolved findings, tag regressions)
    console.log('🔄 Reconciling finding lifecycle states...');
    this.lifecycleManager.reconcile(activeFindingIds, {
      isIncremental: options.isIncremental,
      scannedFiles: options.scannedFiles,
    });

    // 2.5. Finalize active finding occurrences and apply write suppression if structurally unchanged
    for (const id of activeFindingIds) {
      this.findingManager.finalizeFinding(id);
    }

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

    // 7.5. Compile and Write Analytics Datasets
    console.log('📊 Compiling governance analytics...');
    if (FixRegistry.getAll().length === 0) {
      FixRegistry.registerDefaultFixers(); // Ensure fixers are registered for supports checks
    }
    const sessionStore = new SessionStore(AuditEngine.workspaceRoot);
    const rollbackProvider = {
      list: () => RollbackHistory.list(AuditEngine.workspaceRoot),
    };
    const trendProvider = {
      getTrends: () => {
        const file = join(AuditEngine.workspaceRoot, '.governance/metrics/trend-metrics.json');
        if (existsSync(file)) {
          try {
            return JSON.parse(readFileSync(file, 'utf8'));
          } catch {
            return [];
          }
        }
        return [];
      },
    };
    const generatedAt = new Date().toISOString();
    const analyticsResult = AnalyticsEngine.compile(
      allFindings,
      metrics,
      sessionStore,
      rollbackProvider,
      this.findingManager,
      FixRegistry,
      trendProvider,
      generatedAt
    );
    AnalyticsStore.write(analyticsResult, generatedAt, AuditEngine.workspaceRoot);

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

    // 10. Generate daily history snapshot
    const todayStr = new Date().toISOString().split('T')[0];
    const snapshotPath = join(FindingManager.archiveHistoryDir, `${todayStr}.json`);
    const activeFindingsCount = allFindings.filter(f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION').length;
    const closedFindingsCount = allFindings.filter(f => f.status === 'CLOSED').length;
    const suppressedFindingsCount = allFindings.filter(f => f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED').length;

    const snapshotData = {
      timestamp: new Date().toISOString(),
      activeCount: activeFindingsCount,
      closedCount: closedFindingsCount,
      suppressedCount: suppressedFindingsCount,
      findings: allFindings.map(f => ({
        id: f.id,
        rule: f.rule,
        status: f.status,
        occurrenceCount: f.occurrenceCount || 1,
      }))
    };
    const historyRes = writeJsonIfChanged(snapshotPath, snapshotData);
    if (historyRes.written) {
      persistenceStats.trendWritten++;
    }

    // 11. Generate manifest.json
    const manifestPath = join(FindingManager.govDir, 'manifest.json');
    let historySnapshots = 0;
    if (existsSync(FindingManager.archiveHistoryDir)) {
      historySnapshots = readdirSync(FindingManager.archiveHistoryDir).filter(f => f.endsWith('.json')).length;
    }

    const manifest = {
      schemaVersion: 2,
      manifestVersion: 1,
      migrationVersion: 1,
      engineVersion: '1.0.0',
      findingCount: allFindings.length,
      historySnapshots,
      lastMigration: '2026-06-30T15:28:59Z',
      lastAudit: new Date().toISOString(),
      performance: {
        findingsScanned: allFindings.length,
        filesScanned: options.changedFiles ? options.changedFiles.length : 0,
        scanDurationMs: totalDuration,
        groupingDurationMs: totalDuration - (options.validatorTimeMs || 0),
        migrationDurationMs: 0,
        filesWritten: persistenceStats.findingWritten,
        filesArchived: closedFindingsCount,
      }
    };
    writeJsonIfChanged(manifestPath, manifest);

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
      let stateChanged = true;
      if (existsSync(snapshotPath)) {
        const content = readFileSync(snapshotPath, 'utf8');
        const existing = JSON.parse(content) as RepositorySnapshot;
        if (
          existing.commit === snapshot.commit &&
          existing.branch === snapshot.branch &&
          existing.engineVersion === snapshot.engineVersion &&
          existing.ruleRegistryVersion === snapshot.ruleRegistryVersion
        ) {
          stateChanged = false;
        }
      }

      if (stateChanged) {
        const res = writeJsonIfChanged(snapshotPath, snapshot);
        if (res.written) {
          persistenceStats.snapshotWritten++;
        }
      } else {
        console.log('📸 Repository snapshot state unchanged. Skipping write.');
        // Increment examined/skipped counts manually since we bypassed writeJsonIfChanged
        persistenceStats.examined++;
        persistenceStats.skipped++;
      }
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

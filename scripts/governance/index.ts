// scripts/governance/index.ts

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve, join, relative, dirname } from 'path';
import { execSync } from 'child_process';
import { MetadataProvider } from './core/metadata';
import { ConsoleReporter } from './core/reporter';
import { JsonReporter } from './reports/json_reporter';
import { GitHubActionsReporter } from './reports/github_reporter';

// Import Execution Engine
import { ExecutionEngine } from './core/execution_engine';
import { ValidatorRegistry } from './core/validator_registry';
import { AuditEngine } from './core/audit_engine';
import { StatelessViolation } from './core/types';
import { persistenceStats } from './core/json_utils';

const workspaceRoot = resolve(__dirname, '../..');

function getAllMarkdownFiles(workspaceRoot: string): string[] {
  const markdownFiles = new Set<string>();
  try {
    const tracked = execSync('git ls-files "*.md"', { cwd: workspaceRoot, encoding: 'utf8' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);
    const untracked = execSync('git ls-files --others --exclude-standard "*.md"', { cwd: workspaceRoot, encoding: 'utf8' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);
      
    for (const f of [...tracked, ...untracked]) {
      if (!f.startsWith('node_modules/') && !f.startsWith('.governance/') && !f.startsWith('scratch/')) {
        markdownFiles.add(f);
      }
    }
  } catch (err) {
    const scan = (dir: string) => {
      const items = readdirSync(dir);
      for (const item of items) {
        if (['node_modules', '.git', '.next', '.governance', 'dist', '.turbo', 'coverage', 'scratch'].includes(item)) {
          continue;
        }
        const full = join(dir, item);
        let stats;
        try {
          stats = statSync(full);
        } catch {
          continue;
        }
        if (stats.isDirectory()) {
          scan(full);
        } else if (item.endsWith('.md')) {
          markdownFiles.add(relative(workspaceRoot, full));
        }
      }
    };
    scan(workspaceRoot);
  }
  return Array.from(markdownFiles).sort();
}

function getGitDiffFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', { cwd: workspaceRoot, encoding: 'utf8' });
    return output.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: workspaceRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

async function run() {
  const globalStartTime = Date.now();

  if (process.argv.includes('--update-history')) {
    console.log('🔄 Updating historical files baseline...');
    let gitFiles: string[] = [];
    try {
      const output = execSync('git log --all --format="" --name-only', { cwd: workspaceRoot, encoding: 'utf8' });
      gitFiles = output.split('\n')
        .map(f => f.trim())
        .filter(f => f && !f.startsWith('node_modules/') && !f.startsWith('.governance/') && !f.startsWith('scratch/'));
    } catch (err) {
      console.error('❌ Failed to run git log for historical index. Make sure you are in a full clone git repository.');
      process.exit(1);
    }
    
    const currentFiles = getAllMarkdownFiles(workspaceRoot);
    const allHistory = Array.from(new Set([...gitFiles, ...currentFiles])).sort();
    
    const baselinePath = resolve(workspaceRoot, '.governance/baselines/historical-files.json');
    const dir = dirname(baselinePath);
    if (!existsSync(dir)) {
      const fs = require('fs');
      fs.mkdirSync(dir, { recursive: true });
    }
    const fs = require('fs');
    fs.writeFileSync(baselinePath, JSON.stringify(allHistory, null, 2), 'utf8');
    console.log(`✅ Successfully updated historical baseline with ${allHistory.length} entries.`);
    process.exit(0);
  }

  // Drift detection locally
  const historicalFilesPath = resolve(workspaceRoot, '.governance/baselines/historical-files.json');
  if (process.env.GITHUB_ACTIONS !== 'true') {
    let gitFiles: string[] = [];
    try {
      const output = execSync('git log --all --format="" --name-only', { cwd: workspaceRoot, encoding: 'utf8' });
      gitFiles = output.split('\n')
        .map(f => f.trim())
        .filter(f => f && !f.startsWith('node_modules/') && !f.startsWith('.governance/') && !f.startsWith('scratch/'));
    } catch {}

    const currentFiles = getAllMarkdownFiles(workspaceRoot);
    const allHistory = Array.from(new Set([...gitFiles, ...currentFiles])).sort();

    if (allHistory.length > 0) {
      if (existsSync(historicalFilesPath)) {
        const committed = JSON.parse(readFileSync(historicalFilesPath, 'utf8'));
        const missing = allHistory.filter(f => !committed.includes(f));
        if (missing.length > 0) {
          console.error(`❌ Historical files baseline is out of sync. Missing entries: ${missing.slice(0, 5).join(', ')}...`);
          console.error(`👉 Please run "pnpm governance:docs --update-history" to synchronize.`);
          process.exit(1);
        }
      } else {
        console.error(`❌ Historical files baseline does not exist. Please run "pnpm governance:docs --update-history" to initialize.`);
        process.exit(1);
      }
    }
  }

  console.log('🔍 Initializing Governance Metadata Provider...');
  const metadataProvider = new MetadataProvider();
  const metadata = metadataProvider.getMetadata();

  const isIncremental = process.argv.includes('--incremental');
  const changedFiles = getGitDiffFiles();

  // Initialize Audit Engine
  const auditEngine = new AuditEngine();
  metadata.knowledgeGraph = auditEngine.getKnowledgeGraph();

  // 1. Retrieve all indexed repository files from the KnowledgeGraph (SSOT traversal)
  const graph = auditEngine.getKnowledgeGraph();
  const indexedFiles = graph.getIndexedFiles().sort();



  // 2. Parse CLI filters
  const args = process.argv;
  const getMultiArg = (flag: string): string[] => {
    const list: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === flag && i + 1 < args.length) {
        list.push(args[i + 1]);
      }
    }
    return list;
  };

  const filters: {
    rules?: string[];
    categories?: string[];
    validators?: string[];
    owners?: string[];
    severities?: string[];
    enabledOnly?: boolean;
  } = {};

  const rulesFilter = getMultiArg('--rule');
  if (rulesFilter.length > 0) filters.rules = rulesFilter;

  const categoriesFilter = getMultiArg('--category');
  if (categoriesFilter.length > 0) filters.categories = categoriesFilter;

  const validatorsFilter = getMultiArg('--validator');
  if (validatorsFilter.length > 0) filters.validators = validatorsFilter;

  const ownersFilter = getMultiArg('--owner');
  if (ownersFilter.length > 0) filters.owners = ownersFilter;

  const severitiesFilter = getMultiArg('--severity');
  if (severitiesFilter.length > 0) filters.severities = severitiesFilter;

  if (args.includes('--enabled-only')) {
    filters.enabledOnly = true;
  }
  if (args.includes('--disabled')) {
    filters.enabledOnly = false;
  }

  let filesToScan = [...indexedFiles];
  if (isIncremental && changedFiles.length > 0) {
    console.log(`🎯 Incremental scan enabled. Detected ${changedFiles.length} modified files.`);
    const affected = graph.getAffectedConsumers(changedFiles);
    filesToScan = filesToScan.filter(f => affected.has(f) || changedFiles.includes(f));
    console.log(`🎯 Downstream PR scope: Scanning ${filesToScan.length} files.`);
  }

  console.log(`📂 Discovered ${filesToScan.length} files to validate.`);

  console.log('🚀 Running Governance Rule Execution Engine...');
  const plannerStart = Date.now();
  const report = await ExecutionEngine.execute(filesToScan, metadata, filters);
  const plannerDurationMs = Date.now() - plannerStart;

  // Print Performance Timing structure if --performance is passed
  if (args.includes('--performance')) {
    console.log('\n==================================================');
    console.log('⏱️   Validator Performance Metrics');
    console.log('==================================================');
    console.log(`Planner duration:                ${plannerDurationMs}ms`);
    for (const m of report.metrics) {
      console.log(`${m.validatorId.padEnd(32)}: ${m.durationMs}ms (files: ${m.filesProcessed}, heap delta: ${Math.round(m.memoryDeltaBytes / 1024)}KB)`);
    }
    console.log('==================================================\n');
  }

  // Compile all violations to StatelessViolation shape
  const statelessViolations: StatelessViolation[] = [];
  const results = report.results;

  for (const result of report.results) {
    const allErrors = [...result.errors, ...result.warnings];
    const def = ValidatorRegistry.getValidator(result.name) || 
                ValidatorRegistry.getAllValidators().find(v => v.name === result.name);
    
    const construct = def?.id === 'DeadAssetDuplicateValidator' || 
                      def?.id === 'UIDesignValidator' || 
                      def?.id === 'AccessibilityValidator' || 
                      def?.id === 'SharedComponentValidator' ? 'UIElement' : 'Document';

    let confidence = 1.0;
    if (def?.id === 'UIDesignValidator' || def?.id === 'SharedComponentValidator' || def?.id === 'DeadAssetDuplicateValidator') {
      confidence = 0.9;
    }

    for (const error of allErrors) {
      let finalConfidence = confidence;
      if (def?.id === 'AccessibilityValidator') {
        finalConfidence = error.rule === 'VAL-UI-002' || error.rule === 'VAL-UI-003' ? 1.0 : 0.9;
      }
      statelessViolations.push({
        rule: error.rule,
        path: error.file,
        construct,
        line: error.line,
        snippet: error.snippet,
        message: error.message,
        confidence: finalConfidence,
      });
    }
  }

  // 4. Run State and Lifecycle Reconciliation
  console.log('🧠 Running Audit Intelligence Engine...');
  // Sort statelessViolations deterministically before executing the engine
  statelessViolations.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    if (a.rule !== b.rule) return a.rule.localeCompare(b.rule);
    if ((a.construct || '') !== (b.construct || '')) {
      return (a.construct || '').localeCompare(b.construct || '');
    }
    if (a.line !== b.line) return (a.line || 0) - (b.line || 0);
    return (a.message || '').localeCompare(b.message || '');
  });
  const engineResult = auditEngine.execute(statelessViolations, {
    isIncremental,
    changedFiles,
    scannedFiles: filesToScan,
    branchName: getGitBranch(),
    commitSha: getGitCommit(),
    validatorTimeMs: report.totalExecutionTimeMs,
  });

  const globalTotalTimeMs = Date.now() - globalStartTime;

  // Print results summary to console (retaining backward compatibility)
  const { totalErrors } = ConsoleReporter.report(results);

  // Write JSON report
  const reportContent = JsonReporter.report(results, globalTotalTimeMs);

  // Run GitHub Actions Reporter if running in CI
  let gatingSuccess = true;
  if (process.env.GITHUB_ACTIONS === 'true') {
    const ghaResult = GitHubActionsReporter.report(results, reportContent);
    if (!ghaResult.success) {
      console.error(`❌ CI Enforcement Failed: ${ghaResult.failureReason}`);
      gatingSuccess = false;
    }
  }

  console.log(`\n⚖️ Gating Evaluation Action: ${engineResult.gatingAction}`);

  // Print persistence statistics
  console.log('\n==================================================');
  console.log('💾   Persistence Summary Statistics');
  console.log('==================================================');
  console.log(`JSON files examined:             ${persistenceStats.examined}`);
  console.log(`JSON files written:              ${persistenceStats.written}`);
  console.log(`JSON files skipped:              ${persistenceStats.skipped}`);
  console.log(`Snapshot files written:          ${persistenceStats.snapshotWritten}`);
  console.log(`Finding files written:           ${persistenceStats.findingWritten}`);
  console.log(`Cache files written:             ${persistenceStats.cacheWritten}`);
  console.log(`Trend files written:             ${persistenceStats.trendWritten}`);
  console.log('==================================================\n');

  // Gating decision
  if (!engineResult.success || totalErrors > 0 || !gatingSuccess) {
    console.error('\n❌ Governance audit failed. Check the details above.');
    process.exit(1);
  }

  console.log('\n✅ Governance audit passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('💥 Orchestrator encountered a fatal error:', err);
  process.exit(1);
});

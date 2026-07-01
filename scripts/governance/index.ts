// scripts/governance/index.ts

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve, join, relative, dirname } from 'path';
import { execSync } from 'child_process';
import { MetadataProvider } from './core/metadata';
import { ValidatorLoader } from './core/loader';
import { ConsoleReporter } from './core/reporter';
import { JsonReporter } from './reports/json_reporter';
import { GitHubActionsReporter } from './reports/github_reporter';

// Import standard validators
import { MarkdownValidator } from './validators/markdown_validator';
import { LinkValidator } from './validators/link_validator';
import { MermaidValidator } from './validators/mermaid_validator';
import { CrossReferenceValidator } from './validators/cross_reference_validator';
import { DocumentationValidator } from './validators/documentation_validator';
import { SsotValidator } from './validators/ssot_validator';
import { AdrValidator } from './validators/adr_validator';
import { RepositoryHealthValidator } from './validators/repository_health_validator';

// Import new Audit Intelligence components
import { UIDesignValidator } from './validators/ui_design_validator';
import { SharedComponentValidator } from './validators/shared_component_validator';
import { AccessibilityValidator } from './validators/accessibility_validator';
import { AuditEngine } from './core/audit_engine';
import { StatelessViolation } from './core/types';

const workspaceRoot = resolve(__dirname, '../..');

/**
 * Discovers all markdown (.md) files in the repository using git ls-files.
 */
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


/**
 * Recursively scans a directory for code source files.
 */
function scanSourceFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (
        item !== 'node_modules' &&
        item !== '.git' &&
        item !== '.pnpm-store' &&
        item !== '.turbo' &&
        item !== 'dist' &&
        item !== '.next' &&
        item !== '.governance'
      ) {
        scanSourceFiles(fullPath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
      fileList.push(relative(workspaceRoot, fullPath));
    }
  }
  return fileList;
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

  // Discover all markdown and source code files
  const markdownFilesList = getAllMarkdownFiles(workspaceRoot);

  // Scan codebase sources for UI analysis
  const uiSourceFiles = scanSourceFiles(resolve(workspaceRoot, 'apps/admin/src'));
  const webSourceFiles = scanSourceFiles(resolve(workspaceRoot, 'apps/web/src'));
  const uiFilesArray = [...uiSourceFiles, ...webSourceFiles];

  let finalMarkdownFiles = markdownFilesList;
  let finalUiFiles = uiFilesArray;

  // 2. Perform Incremental & Dependency-Aware Auditing filter
  if (isIncremental && changedFiles.length > 0) {
    console.log(`🎯 Incremental scan enabled. Detected ${changedFiles.length} modified files.`);
    const graph = auditEngine.getKnowledgeGraph();
    const affected = graph.getAffectedConsumers(changedFiles);

    finalMarkdownFiles = finalMarkdownFiles.filter(f => affected.has(f) || changedFiles.includes(f));
    finalUiFiles = finalUiFiles.filter(f => affected.has(f) || changedFiles.includes(f));
    console.log(`🎯 Downstream PR scope: Scanning ${finalMarkdownFiles.length} markdown and ${finalUiFiles.length} source files.`);
  }

  console.log(`📂 Discovered ${finalMarkdownFiles.length} markdown files and ${finalUiFiles.length} source code files to validate.`);

  // Configure standard loader
  const loader = new ValidatorLoader();
  loader.registerAll([
    new MarkdownValidator(),
    new LinkValidator(),
    new MermaidValidator(),
    new CrossReferenceValidator(),
    new DocumentationValidator(),
    new SsotValidator(),
    new AdrValidator(),
    new RepositoryHealthValidator(),
  ]);

  console.log('🚀 Running standard validators...');
  const validatorStart = Date.now();
  const results = await loader.runAll(finalMarkdownFiles, metadata);
  const validatorTime = Date.now() - validatorStart;

  // Compile all violations to StatelessViolation shape
  const statelessViolations: StatelessViolation[] = [];

  // Parse results from standard validators
  for (const result of results) {
    const allErrors = [...result.errors, ...result.warnings];
    for (const error of allErrors) {
      statelessViolations.push({
        rule: error.rule,
        path: error.file,
        construct: 'Document',
        line: error.line,
        snippet: error.snippet,
        message: error.message,
        confidence: 1.0, // High precision standard checks
      });
    }
  }

  // 3. Execute Stateless UI Design Validators
  console.log('🎨 Running stateless UI design and architecture validators...');
  const uiLoader = new ValidatorLoader();
  uiLoader.registerAll([
    new UIDesignValidator(),
    new AccessibilityValidator(),
    new SharedComponentValidator(),
  ]);

  const uiResults = await uiLoader.runAll(finalUiFiles, metadata);
  results.push(...uiResults);

  // Convert UI results to StatelessViolation records for lifecycle reconciliation
  for (const uiResult of uiResults) {
    const allErrors = [...uiResult.errors, ...uiResult.warnings];
    for (const error of allErrors) {
      statelessViolations.push({
        rule: error.rule,
        path: error.file,
        construct: 'UIElement',
        line: error.line,
        snippet: error.snippet,
        message: error.message,
        confidence: error.rule === 'VAL-UI-002' || error.rule === 'VAL-UI-003' ? 1.0 : 0.9,
      });
    }
  }

  // 4. Run State and Lifecycle Reconciliation
  console.log('🧠 Running Audit Intelligence Engine...');
  const engineResult = auditEngine.execute(statelessViolations, {
    isIncremental,
    changedFiles,
    branchName: getGitBranch(),
    commitSha: getGitCommit(),
    validatorTimeMs: validatorTime,
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

// scripts/governance/index.ts

import { readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, relative } from 'path';
import { MetadataProvider } from './core/metadata';
import { ValidatorLoader } from './core/loader';
import { ConsoleReporter } from './core/reporter';
import { JsonReporter } from './reports/json_reporter';
import { GitHubActionsReporter } from './reports/github_reporter';

// Import validators
import { MarkdownValidator } from './validators/markdown_validator';
import { LinkValidator } from './validators/link_validator';
import { MermaidValidator } from './validators/mermaid_validator';
import { CrossReferenceValidator } from './validators/cross_reference_validator';
import { DocumentationValidator } from './validators/documentation_validator';
import { SsotValidator } from './validators/ssot_validator';
import { AdrValidator } from './validators/adr_validator';
import { RepositoryHealthValidator } from './validators/repository_health_validator';

const workspaceRoot = resolve(__dirname, '../..');

/**
 * Recursively scans a directory for markdown (.md) files.
 */
function scanMarkdownFiles(dir: string, fileList: string[] = []): string[] {
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
        item !== 'archive' &&
        item !== 'audit'
      ) {
        scanMarkdownFiles(fullPath, fileList);
      }
    } else if (item.endsWith('.md')) {
      fileList.push(relative(workspaceRoot, fullPath));
    }
  }
  return fileList;
}

async function run() {
  const globalStartTime = Date.now();

  console.log('🔍 Initializing Governance Metadata Provider...');
  const metadataProvider = new MetadataProvider();
  const metadata = metadataProvider.getMetadata();

  // Discover files to check
  // 1. Start with the required files from metadata
  const filesToCheck = new Set<string>();
  for (const doc of metadata.requiredDocuments) {
    const fullPath = resolve(workspaceRoot, doc);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      filesToCheck.add(doc);
    }
  }

  // 2. Add all markdown files found in the root directory
  const rootItems = readdirSync(workspaceRoot);
  for (const item of rootItems) {
    if (item.endsWith('.md')) {
      filesToCheck.add(item);
    }
  }

  // 3. Scan the docs/ folder recursively for markdown files
  const docsDir = resolve(workspaceRoot, 'docs');
  const docsFiles = scanMarkdownFiles(docsDir);
  for (const file of docsFiles) {
    filesToCheck.add(file);
  }

  const filesArray = Array.from(filesToCheck);
  console.log(`📂 Discovered ${filesArray.length} markdown documents to validate.`);

  // Instantiate and configure loader
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

  console.log('🚀 Running validators...');
  const results = await loader.runAll(filesArray, metadata);

  const globalTotalTimeMs = Date.now() - globalStartTime;

  // Print results to console
  const { totalErrors } = ConsoleReporter.report(results);

  // Write JSON report
  const reportContent = JsonReporter.report(results, globalTotalTimeMs);

  // Run GitHub Actions Reporter if running in CI or if GHA env is active
  let gatingSuccess = true;
  if (process.env.GITHUB_ACTIONS === 'true') {
    const ghaResult = GitHubActionsReporter.report(results, reportContent);
    if (!ghaResult.success) {
      console.error(`❌ CI Enforcement Failed: ${ghaResult.failureReason}`);
      gatingSuccess = false;
    }
  }

  if (totalErrors > 0 || !gatingSuccess) {
    console.error('❌ Governance audit failed. Check the details above.');
    process.exit(1);
  }

  console.log('✅ Governance audit passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('💥 Orchestrator encountered a fatal error:', err);
  process.exit(1);
});

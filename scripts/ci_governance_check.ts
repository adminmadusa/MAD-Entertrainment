// scripts/ci_governance_check.ts
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

interface Violation {
  file: string;
  rule: string;
  line: number;
  snippet: string;
}

const violations: Violation[] = [];

// Recursive file scanner
function scanDir(dir: string, callback: (filePath: string) => void) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, callback);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      callback(filePath);
    }
  }
}

// Rule validations
function checkFile(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Rule 1: Client/Component imports of Sentry Node, OpenTelemetry or AsyncLocalStorage
    if (
      filePath.includes('apps/web/src') ||
      filePath.includes('apps/admin/src')
    ) {
      if (line.includes('@sentry/node')) {
        violations.push({
          file: filePath,
          rule: 'Observability Isolation: Frontend must not import "@sentry/node". Use "@sentry/nextjs" or clientside instrumentation.',
          line: lineNum,
          snippet: line.trim(),
        });
      }
      if (line.includes('@opentelemetry/') || line.includes('@fastify/otel')) {
        violations.push({
          file: filePath,
          rule: 'Observability Isolation: Frontend must not import "@opentelemetry/*" or "@fastify/otel" directly.',
          line: lineNum,
          snippet: line.trim(),
        });
      }
      if (line.includes('AsyncLocalStorage') || line.includes("from 'async_hooks'")) {
        violations.push({
          file: filePath,
          rule: 'Observability Isolation: Frontend must not use "AsyncLocalStorage".',
          line: lineNum,
          snippet: line.trim(),
        });
      }
    }

    // Rule 2: Pages & UI components must not import Axios directly (they must use the service layer)
    const isUIFile =
      (filePath.includes('apps/web/src/app/') ||
        filePath.includes('apps/web/src/components/') ||
        filePath.includes('apps/admin/src/app/') ||
        filePath.includes('apps/admin/src/components/')) &&
      !filePath.includes('/lib/api/');

    if (isUIFile) {
      if (
        (line.includes("import axios") || line.includes("from 'axios'")) &&
        !line.includes('//')
      ) {
        violations.push({
          file: filePath,
          rule: 'DTO Governance: UI Components and Pages must not import Axios directly. Use the service API client wrappers.',
          line: lineNum,
          snippet: line.trim(),
        });
      }
    }

    // Rule 3: Nested html/body tags (allowed only in the root layouts)
    const isRootLayout =
      filePath.endsWith('apps/web/src/app/layout.tsx') ||
      filePath.endsWith('apps/admin/src/app/layout.tsx') ||
      filePath.endsWith('/app/global-error.tsx');

    if (
      (filePath.includes('apps/web/src/app/') ||
        filePath.includes('apps/admin/src/app/')) &&
      !isRootLayout
    ) {
      if (
        (line.includes('<html') ||
          line.includes('<body') ||
          line.includes('</html') ||
          line.includes('</body')) &&
        !line.includes('//')
      ) {
        violations.push({
          file: filePath,
          rule: 'App Router Safety: Nested layouts and components must not contain <html> or <body> tags. These are only allowed in the root layout.tsx.',
          line: lineNum,
          snippet: line.trim(),
        });
      }
    }
  });
}

function runAudit() {
  console.log('🔍 Starting CI Governance Validation...');

  const pathsToScan = [
    resolve(__dirname, '../apps/web/src'),
    resolve(__dirname, '../apps/admin/src'),
  ];

  pathsToScan.forEach((scanPath) => {
    console.log(`Scanning: ${scanPath}`);
    scanDir(scanPath, checkFile);
  });

  if (violations.length > 0) {
    console.error('\n❌ CI Governance checks failed! Violations found:');
    violations.forEach((v) => {
      console.error(`- [${v.rule}] in ${v.file}:${v.line}`);
      console.error(`  Snippet: "${v.snippet}"\n`);
    });
    process.exit(1);
  }

  console.log('\n✅ CI Governance checks passed successfully!');
}

runAudit();

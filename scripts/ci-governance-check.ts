// scripts/ci-governance-check.ts
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

    // Rule 4: Validation Drift Detection (checks form components for manual business validations)
    const isClientForm = filePath.includes('apps/web/src/components/') && filePath.endsWith('Form.tsx');
    if (isClientForm) {
      const forbiddenPatterns = [
        { term: '.email(', required: 'Use emailSchema or checkEmailSchema from @mad/validations' },
        { term: '.regex(', required: 'Use updateProfileSchema or checkoutDetailsSchema from @mad/validations' },
        { term: '.test(', required: 'Use zod validations from @mad/validations' },
        { term: 'new RegExp(', required: 'Use zod validations from @mad/validations' },
      ];

      forbiddenPatterns.forEach(({ term, required }) => {
        if (line.includes(term) && !line.includes('//')) {
          violations.push({
            file: filePath,
            rule: 'Validation Drift Detection',
            line: lineNum,
            snippet: line.trim(),
          });

          // Print Rule 4C Governance Violation Report
          console.error('\nValidation Drift Violation\n');
          console.error(`File:\n${filePath}\n`);
          console.error(`Line:\n${lineNum}\n`);
          console.error(`Rule:\nValidation Drift Detection\n`);
          console.error(`Detected:\n${term}\n`);
          console.error(`Required:\n${required}\n`);
        }
      });
    }
  });
}

function runAudit() {
  console.log('🔍 Starting CI Governance Validation...');

  // 1. Filename Casing check for scripts/
  const scriptsDir = resolve(__dirname, '.');
  if (existsSync(scriptsDir)) {
    const files = readdirSync(scriptsDir);
    const kebabCaseRegex = /^[a-z0-9-]+(\.[a-z0-9]+)+$/;
    for (const file of files) {
      const fullPath = join(scriptsDir, file);
      if (statSync(fullPath).isFile()) {
        if (!kebabCaseRegex.test(file)) {
          violations.push({
            file: fullPath,
            rule: 'Repository Naming Standards: All automation/utility scripts must be named in lowercase kebab-case.',
            line: 0,
            snippet: file,
          });
        }
      }
    }
  }

  // 2. Root folder hygiene validation check
  const rootDir = resolve(__dirname, '..');
  if (existsSync(rootDir)) {
    const files = readdirSync(rootDir);
    const allowedJsonFiles = new Set([
      'package.json',
      'tsconfig.json',
      'tsconfig.base.json',
      'vercel.json',
      '.audit-exceptions.json',
      'turbo.json',
      '.commitlintrc.json',
    ]);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = join(rootDir, file);
        if (statSync(fullPath).isFile() && !allowedJsonFiles.has(file)) {
          violations.push({
            file: fullPath,
            rule: 'Repository Hygiene: No unapproved JSON files are allowed in the repository root directory.',
            line: 0,
            snippet: file,
          });
        }
      }
    }
  }

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

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface AuditException {
  id: string;
  justification: string;
  expiration: string; // YYYY-MM-DD
  approver: string;
}

function runAudit() {
  console.log('🔍 Starting dependency vulnerability audit...');

  // 1. Load and validate .audit-exceptions.json
  const exceptionsPath = resolve(process.cwd(), '.audit-exceptions.json');
  let exceptions: AuditException[] = [];

  if (existsSync(exceptionsPath)) {
    try {
      const content = readFileSync(exceptionsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        exceptions = parsed;
      } else if (parsed && Array.isArray(parsed.exceptions)) {
        exceptions = parsed.exceptions;
      } else {
        console.error('❌ Exception registry must be a JSON array or contain an "exceptions" array.');
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`❌ Failed to read or parse .audit-exceptions.json: ${err.message}`);
      process.exit(1);
    }
  }

  // Validate registry entry schemas
  let invalidRegistry = false;
  const currentDate = new Date();
  // Set current date time to midnight for simple date comparison
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < exceptions.length; i++) {
    const entry = exceptions[i];
    const indexStr = `at index ${i}`;

    if (!entry.id) {
      console.error(`❌ Governance Error: Missing "id" in exception registry ${indexStr}`);
      invalidRegistry = true;
    }
    if (!entry.justification || entry.justification.trim() === '') {
      console.error(`❌ Governance Error: Missing or empty "justification" in exception registry ${indexStr} (ID: ${entry.id || 'unknown'})`);
      invalidRegistry = true;
    }
    if (!entry.approver || entry.approver.trim() === '') {
      console.error(`❌ Governance Error: Missing or empty "approver" in exception registry ${indexStr} (ID: ${entry.id || 'unknown'})`);
      invalidRegistry = true;
    }
    if (!entry.expiration) {
      console.error(`❌ Governance Error: Missing "expiration" date in exception registry ${indexStr} (ID: ${entry.id || 'unknown'})`);
      invalidRegistry = true;
    } else {
      const expDate = new Date(entry.expiration);
      if (isNaN(expDate.getTime())) {
        console.error(`❌ Governance Error: Invalid "expiration" date format "${entry.expiration}" ${indexStr} (ID: ${entry.id || 'unknown'}). Use YYYY-MM-DD.`);
        invalidRegistry = true;
      }
    }
  }

  if (invalidRegistry) {
    console.error('❌ Dependency audit aborted due to invalid exception registry configuration.');
    process.exit(1);
  }

  // 2. Run pnpm audit --prod --json
  let auditJson = '';
  try {
    auditJson = execSync('pnpm audit --prod --json', { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  } catch (err: any) {
    auditJson = err.stdout || '';
    if (!auditJson) {
      console.error('❌ Failed to run pnpm audit command:', err.message || err);
      process.exit(1);
    }
  }

  // 3. Parse and evaluate vulnerabilities
  let auditData;
  try {
    auditData = JSON.parse(auditJson);
  } catch (err: any) {
    console.error('❌ Failed to parse pnpm audit JSON output:', err.message);
    process.exit(1);
  }

  const advisories = auditData.advisories || {};
  let failed = false;

  for (const key of Object.keys(advisories)) {
    const advisory = advisories[key];
    const severity = advisory.severity?.toLowerCase();
    const ghsaId = advisory.github_advisory_id;
    const cves = advisory.cves || [];
    const id = String(advisory.id);

    const isCriticalOrHigh = severity === 'critical' || severity === 'high';

    if (isCriticalOrHigh) {
      // Look for match in exceptions registry
      const exception = exceptions.find(e =>
        (ghsaId && e.id.toLowerCase() === ghsaId.toLowerCase()) ||
        cves.some((cve: string) => cve.toLowerCase() === e.id.toLowerCase()) ||
        e.id === id
      );

      if (exception) {
        const expDate = new Date(exception.expiration);
        // Expiration check: if current date is strictly after the expiration date, it has expired.
        if (currentDate > expDate) {
          console.error(`❌ EXPIRED EXCEPTION: ${ghsaId || id} (${advisory.module_name}, ${severity}) was excepted but expired on ${exception.expiration}.`);
          console.error(`   Justification: ${exception.justification}`);
          console.error(`   Approver: ${exception.approver}\n`);
          failed = true;
        } else {
          console.log(`⚠️  EXCEPTED VULNERABILITY: [${ghsaId || id}] ${advisory.module_name} (${severity}) is allowed until ${exception.expiration}.`);
          console.log(`   Justification: ${exception.justification}`);
          console.log(`   Approver: ${exception.approver}\n`);
        }
      } else {
        console.error(`❌ UNEXCEPTED VULNERABILITY: Found ${severity} vulnerability in package '${advisory.module_name}'`);
        console.error(`   ID: ${ghsaId || id}`);
        if (cves.length > 0) console.error(`   CVEs: ${cves.join(', ')}`);
        console.error(`   Recommendation: ${advisory.recommendation}`);
        console.error(`   URL: ${advisory.url}\n`);
        failed = true;
      }
    } else {
      console.log(`ℹ️  ADVISORY VULNERABILITY: [${ghsaId || id}] ${advisory.module_name} (${severity})`);
      console.log(`   Recommendation: ${advisory.recommendation}`);
      console.log(`   URL: ${advisory.url}\n`);
    }
  }

  if (failed) {
    console.error('❌ Dependency audit failed. Resolved all vulnerabilities or register valid exceptions in .audit-exceptions.json.');
    process.exit(1);
  } else {
    console.log('✅ Dependency audit passed successfully!');
    process.exit(0);
  }
}

runAudit();

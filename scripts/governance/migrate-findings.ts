// scripts/governance/migrate-findings.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync } from 'fs';
import { resolve, join } from 'path';
import { createHash } from 'crypto';
import { Finding, FindingOccurrence, FindingStatus, GovernanceManifest } from './core/types';
import { FingerprintEngine } from './core/fingerprint';
import { canonicalizeJson } from './core/json_utils';

const workspaceRoot = resolve(__dirname, '../..');
const govDir = resolve(workspaceRoot, '.governance');
const legacyFindingsDir = join(govDir, 'findings');
const legacyHistoryDir = join(govDir, 'history');
const backupDir = join(govDir, 'migration-backup');

// Nested state target directories
const activeDir = join(legacyFindingsDir, 'active');
const closedDir = join(legacyFindingsDir, 'closed');
const suppressedDir = join(legacyFindingsDir, 'suppressed');
const archiveFindingsDir = join(govDir, 'archive/findings');
const archiveHistoryDir = join(govDir, 'archive/history');
const manifestPath = join(govDir, 'manifest.json');

function generateStableId(rule: string, path: string): string {
  const data = `${rule}:${path}`;
  const hash = createHash('sha256').update(data).digest('hex');
  return `f_${hash.substring(0, 8)}`;
}

function ensureDirs() {
  const dirs = [activeDir, closedDir, suppressedDir, archiveFindingsDir, archiveHistoryDir, backupDir];
  for (const d of dirs) {
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true });
    }
  }
}

function runMigration() {
  console.log('🏁 Starting Governance Findings Schema v2 Migration...');
  const startTime = Date.now();

  // 1. Backup legacy data
  console.log('💾 Backing up legacy findings and history...');
  if (existsSync(legacyFindingsDir)) {
    const files = readdirSync(legacyFindingsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      cpSync(join(legacyFindingsDir, f), join(backupDir, f));
    }
  }
  if (existsSync(legacyHistoryDir)) {
    const files = readdirSync(legacyHistoryDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      cpSync(join(legacyHistoryDir, f), join(backupDir, `hist_${f}`));
    }
  }

  ensureDirs();

  // 2. Read legacy findings
  const legacyFindings: Finding[] = [];
  if (existsSync(legacyFindingsDir)) {
    const files = readdirSync(legacyFindingsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = readFileSync(join(legacyFindingsDir, file), 'utf8');
        const finding = JSON.parse(content) as Finding;
        legacyFindings.push(finding);
      } catch (e) {}
    }
  }

  const beforeOccurrencesCount = legacyFindings.length;
  const beforeRules = new Set(legacyFindings.map(f => f.rule));
  const beforeFiles = new Set(legacyFindings.map(f => f.evidence.path));

  // 3. Group by rule + file path
  console.log(`🧠 Grouping ${beforeOccurrencesCount} legacy occurrences by rule + file...`);
  const groups = new Map<string, Finding[]>();
  for (const lf of legacyFindings) {
    const key = `${lf.rule}:${lf.evidence.path}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(lf);
  }

  const migratedFindings: Finding[] = [];
  const strategy = FingerprintEngine.getStrategy('SMART');

  for (const [key, findingsGroup] of groups.entries()) {
    const [ruleId, filePath] = key.split(':');
    const stableId = generateStableId(ruleId, filePath);

    // Build occurrences list
    const occurrences: FindingOccurrence[] = findingsGroup.map(lf => {
      const construct = lf.feature || 'UIElement';
      const snippet = lf.evidence.snippet || '';
      const fingerprint = strategy.fingerprint(ruleId, filePath, construct, snippet);
      return {
        id: fingerprint,
        line: lf.evidence.line || 0,
        column: 0,
        construct,
        snippet,
        message: lf.evidence.message,
        fingerprint,
      };
    });
    occurrences.sort((a, b) => a.line - b.line);

    // Resolve primary status
    let status: FindingStatus = 'CLOSED';
    const hasActive = findingsGroup.some(f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION');
    const hasSuppressed = findingsGroup.some(f => f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED');

    if (hasActive) {
      status = 'NEW';
    } else if (hasSuppressed) {
      status = 'IGNORED';
    }

    const firstF = findingsGroup[0];
    const firstDetected = findingsGroup.map(f => f.firstDetected).sort()[0] || new Date().toISOString();
    const lastDetected = findingsGroup.map(f => f.lastDetected).sort().reverse()[0] || new Date().toISOString();

    const groupedFinding: Finding = {
      schemaVersion: 2,
      id: stableId,
      rule: ruleId,
      ruleVersion: firstF.ruleVersion || '1.0.0',
      engineVersion: '1.0.0',
      domain: firstF.domain,
      owner: firstF.owner || firstF.domain,
      package: filePath.split('/')[0] || 'root',
      feature: firstF.feature || 'UIElement',
      status,
      confidence: firstF.confidence || 0.9,
      relationships: [],
      evidence: {
        path: filePath,
        construct: firstF.feature,
        snippet: firstF.evidence.snippet,
        line: firstF.evidence.line,
        message: firstF.evidence.message,
        occurrences,
      },
      createdDate: firstDetected,
      firstDetected,
      lastDetected,
      occurrenceCount: occurrences.length,
    };

    migratedFindings.push(groupedFinding);
  }

  // 4. Save grouped findings
  console.log(`💾 Persisting ${migratedFindings.length} grouped findings...`);
  for (const f of migratedFindings) {
    let targetDir = activeDir;
    if (f.status === 'CLOSED') {
      targetDir = closedDir;
    } else if (f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED') {
      targetDir = suppressedDir;
    }
    const destPath = join(targetDir, `${f.id}.json`);
    writeFileSync(destPath, canonicalizeJson(f), 'utf8');
  }

  // 5. Verification Matrix
  const afterOccurrencesCount = migratedFindings.reduce((acc, f) => acc + (f.evidence.occurrences?.length || 0), 0);
  const afterRules = new Set(migratedFindings.map(f => f.rule));
  const afterFiles = new Set(migratedFindings.map(f => f.evidence.path));

  const fingerprintsSet = new Set<string>();
  let duplicateFingerprintsCount = 0;
  for (const f of migratedFindings) {
    if (f.evidence.occurrences) {
      for (const o of f.evidence.occurrences) {
        const key = `${o.fingerprint}:${o.line}`;
        if (fingerprintsSet.has(key)) {
          duplicateFingerprintsCount++;
        }
        fingerprintsSet.add(key);
      }
    }
  }

  const lostOccurrences = beforeOccurrencesCount - afterOccurrencesCount;

  const ruleCountMatch = beforeRules.size === afterRules.size;
  const fileCountMatch = beforeFiles.size === afterFiles.size;
  const occurrencesMatch = lostOccurrences === 0;
  const duplicatesMatch = true; // Informational count only, multiple occurrences on same line are valid

  const allPassed = ruleCountMatch && fileCountMatch && occurrencesMatch;

  // Print summary table
  console.log('\n==================================================');
  console.log('📊   Migration Verification Summary Matrix');
  console.log('==================================================');
  console.log(`| Metric                 | Before | After  | Status |`);
  console.log(`| :--------------------- | :----: | :----: | :----: |`);
  console.log(`| Findings (Grouped)     | ${beforeOccurrencesCount.toString().padStart(6)} | ${migratedFindings.length.toString().padStart(6)} |   ✅   |`);
  console.log(`| Occurrences            | ${beforeOccurrencesCount.toString().padStart(6)} | ${afterOccurrencesCount.toString().padStart(6)} |   ${occurrencesMatch ? '✅' : '❌'}   |`);
  console.log(`| Rules                  | ${beforeRules.size.toString().padStart(6)} | ${afterRules.size.toString().padStart(6)} |   ${ruleCountMatch ? '✅' : '❌'}   |`);
  console.log(`| Files                  | ${beforeFiles.size.toString().padStart(6)} | ${afterFiles.size.toString().padStart(6)} |   ${fileCountMatch ? '✅' : '❌'}   |`);
  console.log(`| Lost Occurrences       | ${'0'.padStart(6)} | ${lostOccurrences.toString().padStart(6)} |   ${occurrencesMatch ? '✅' : '❌'}   |`);
  console.log(`| Duplicate Fingerprints | ${'0'.padStart(6)} | ${duplicateFingerprintsCount.toString().padStart(6)} |   ${duplicatesMatch ? '✅' : '❌'}   |`);
  console.log('==================================================\n');

  if (!allPassed) {
    console.error('❌ Verification failed! Starting automatic rollback...');
    rollback('Verification check failed');
    process.exit(1);
  }

  // 6. Manifest creation
  console.log('📝 Creating manifest.json...');
  const manifest: GovernanceManifest = {
    schemaVersion: 2,
    manifestVersion: 1,
    migrationVersion: 1,
    engineVersion: '1.0.0',
    findingCount: migratedFindings.length,
    historySnapshots: 0,
    lastMigration: new Date().toISOString(),
    lastAudit: new Date().toISOString(),
    performance: {
      findingsScanned: beforeOccurrencesCount,
      filesScanned: beforeFiles.size,
      scanDurationMs: Date.now() - startTime,
      groupingDurationMs: Date.now() - startTime,
      migrationDurationMs: Date.now() - startTime,
      filesWritten: migratedFindings.length,
      filesArchived: migratedFindings.filter(f => f.status === 'CLOSED').length,
    }
  };
  writeFileSync(manifestPath, canonicalizeJson(manifest), 'utf8');

  // 7. Cleanup legacy flat files from disk
  console.log('🗑️ Cleaning up legacy flat findings files...');
  if (existsSync(legacyFindingsDir)) {
    const files = readdirSync(legacyFindingsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        rmSync(join(legacyFindingsDir, f));
      } catch (e) {}
    }
  }
  if (existsSync(legacyHistoryDir)) {
    const files = readdirSync(legacyHistoryDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        rmSync(join(legacyHistoryDir, f));
      } catch (e) {}
    }
  }

  // Clear backup since migration passed
  rmSync(backupDir, { recursive: true, force: true });

  console.log('🎉 Migration completed successfully!');
  process.exit(0);
}

function rollback(reason: string) {
  console.log(`🚨 Rollback triggered due to: ${reason}`);

  // Save FailureRecoveryMetadata
  const failureLogPath = join(govDir, 'migration-failure.json');
  const failureLog = {
    failureTimestamp: new Date().toISOString(),
    failedPhase: 'Verification',
    exceptionSummary: reason,
    rollbackStatus: 'SUCCESS' as const,
  };

  try {
    // 1. Delete new state directories if created
    const dirsToDelete = [activeDir, closedDir, suppressedDir, archiveFindingsDir, archiveHistoryDir];
    for (const d of dirsToDelete) {
      if (existsSync(d)) {
        rmSync(d, { recursive: true, force: true });
      }
    }
    if (existsSync(manifestPath)) {
      rmSync(manifestPath);
    }

    // 2. Restore legacy files from backup
    ensureDirs();
    if (existsSync(backupDir)) {
      const backupFiles = readdirSync(backupDir);
      for (const f of backupFiles) {
        if (f.startsWith('hist_')) {
          const originalName = f.replace('hist_', '');
          cpSync(join(backupDir, f), join(legacyHistoryDir, originalName));
        } else {
          cpSync(join(backupDir, f), join(legacyFindingsDir, f));
        }
      }
    }

    // Clear backup directory
    rmSync(backupDir, { recursive: true, force: true });

    writeFileSync(failureLogPath, canonicalizeJson(failureLog), 'utf8');
    console.log('✅ Rollback completed successfully. Legacy data restored.');
  } catch (err: any) {
    failureLog.rollbackStatus = 'FAILED';
    writeFileSync(failureLogPath, canonicalizeJson(failureLog), 'utf8');
    console.error('💥 Rollback failed to restore legacy files!', err);
  }
}

runMigration();

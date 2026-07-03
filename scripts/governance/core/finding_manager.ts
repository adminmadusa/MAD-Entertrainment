// scripts/governance/core/finding_manager.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { Finding, FindingException, FindingStatus, HistoryEvent, StatelessViolation, FindingOccurrence } from './types';
import { RuleRegistry } from '../rules/registry';
import { RenameDetector } from './rename_detector';
import { writeJsonIfChanged, persistenceStats } from './json_utils';
import { createHash } from 'crypto';
import { FingerprintEngine } from './fingerprint';

export class FindingManager {
  public static workspaceRoot = resolve(__dirname, '../../..');
  public static govDir = resolve(FindingManager.workspaceRoot, '.governance');
  public static findingsDir = join(FindingManager.govDir, 'findings');
  public static activeDir = join(FindingManager.findingsDir, 'active');
  public static closedDir = join(FindingManager.findingsDir, 'closed');
  public static suppressedDir = join(FindingManager.findingsDir, 'suppressed');
  public static archiveFindingsDir = join(FindingManager.govDir, 'archive/findings');
  public static archiveHistoryDir = join(FindingManager.govDir, 'archive/history');
  public static exceptionsDir = join(FindingManager.govDir, 'exceptions');
  public static historyDir = join(FindingManager.govDir, 'history');
  public static baselinesDir = join(FindingManager.govDir, 'baselines');
  public static metricsDir = join(FindingManager.govDir, 'metrics');

  private findings = new Map<string, Finding>();
  private exceptions = new Map<string, FindingException>();
  private nextIndices = new Map<string, number>();
  private originalOccurrences = new Map<string, FindingOccurrence[]>();

  public static retentionPolicy = {
    closedFindingsDays: 90,
    dailySnapshots: 30,
    monthlySnapshots: true,
  };

  constructor() {
    this.ensureDirectoriesExist();
    this.loadAll();
    this.applyRetentionPolicy();
  }

  private ensureDirectoriesExist() {
    const dirs = [
      FindingManager.govDir,
      FindingManager.findingsDir,
      FindingManager.activeDir,
      FindingManager.closedDir,
      FindingManager.suppressedDir,
      FindingManager.archiveFindingsDir,
      FindingManager.archiveHistoryDir,
      FindingManager.exceptionsDir,
      FindingManager.historyDir,
      FindingManager.baselinesDir,
      FindingManager.metricsDir,
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadAll() {
    // 1. Load Exceptions deterministically
    if (existsSync(FindingManager.exceptionsDir)) {
      const files = readdirSync(FindingManager.exceptionsDir).sort();
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = readFileSync(join(FindingManager.exceptionsDir, file), 'utf8');
            const exception = JSON.parse(content) as FindingException;
            this.exceptions.set(exception.id, exception);
          } catch (e) {
            // Ignore bad exception JSONs
          }
        }
      }
    }

    // 2. Load Findings from nested state subfolders
    const stateDirs = [
      FindingManager.activeDir,
      FindingManager.closedDir,
      FindingManager.suppressedDir,
    ];

    const getJsonFilesRecursive = (dir: string): string[] => {
      const results: string[] = [];
      if (!existsSync(dir)) return results;
      const list = readdirSync(dir);
      for (const file of list) {
        const fullPath = join(dir, file);
        if (statSync(fullPath).isDirectory()) {
          results.push(...getJsonFilesRecursive(fullPath));
        } else if (file.endsWith('.json')) {
          results.push(fullPath);
        }
      }
      return results;
    };

    for (const dir of stateDirs) {
      if (existsSync(dir)) {
        const files = getJsonFilesRecursive(dir).sort();
        for (const filePath of files) {
          try {
            const content = readFileSync(filePath, 'utf8');
            const finding = JSON.parse(content) as Finding;

            // Inline upgrade of legacy STRICT occurrence fingerprints to SMART
            if (finding.evidence.occurrences) {
              const strategy = FingerprintEngine.getStrategy('SMART');
              finding.evidence.occurrences = finding.evidence.occurrences.map(o => {
                const smartFingerprint = strategy.fingerprint(
                  finding.rule,
                  finding.evidence.path,
                  o.construct || 'UIElement',
                  o.snippet || ''
                );
                if (o.id !== smartFingerprint || o.fingerprint !== smartFingerprint) {
                  return {
                    ...o,
                    id: smartFingerprint,
                    fingerprint: smartFingerprint,
                  };
                }
                return o;
              });
            }

            this.findings.set(finding.id, finding);
            this.updateNextIndex(finding.id);
          } catch (e) {
            // Ignore bad finding JSONs
          }
        }
      }
    }
  }

  public applyRetentionPolicy() {
    // 1. Archive closed findings to archive/findings/ after retention period
    if (existsSync(FindingManager.closedDir)) {
      const getClosedFiles = (dir: string): string[] => {
        const results: string[] = [];
        const files = readdirSync(dir);
        for (const file of files) {
          const fullPath = join(dir, file);
          if (statSync(fullPath).isDirectory()) {
            results.push(...getClosedFiles(fullPath));
          } else if (file.endsWith('.json')) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const files = getClosedFiles(FindingManager.closedDir);
      const now = Date.now();
      const maxAgeMs = FindingManager.retentionPolicy.closedFindingsDays * 24 * 60 * 60 * 1000;
      for (const filePath of files) {
        try {
          const stats = statSync(filePath);
          const ageMs = now - stats.mtime.getTime();
          if (ageMs > maxAgeMs) {
            const fileName = resolve(filePath).split('/').pop() || '';
            const destPath = join(FindingManager.archiveFindingsDir, fileName);
            require('fs').renameSync(filePath, destPath);
            console.log(`🗄️ Archived expired closed finding: ${fileName}`);
          }
        } catch (e) {}
      }

      // Clean up empty directories in closedDir
      const subdirs = readdirSync(FindingManager.closedDir);
      for (const subdir of subdirs) {
        const fullSubdir = join(FindingManager.closedDir, subdir);
        if (statSync(fullSubdir).isDirectory()) {
          const contents = readdirSync(fullSubdir);
          if (contents.length === 0) {
            try {
              require('fs').rmdirSync(fullSubdir);
            } catch (e) {}
          }
        }
      }
    }

    // 2. Prune daily snapshots in archive/history/ after retention period
    if (existsSync(FindingManager.archiveHistoryDir)) {
      const files = readdirSync(FindingManager.archiveHistoryDir);
      const now = Date.now();
      const maxAgeMs = FindingManager.retentionPolicy.dailySnapshots * 24 * 60 * 60 * 1000;
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(FindingManager.archiveHistoryDir, file);
          try {
            const dateStr = file.replace('.json', '');
            const fileDate = new Date(dateStr);
            if (isNaN(fileDate.getTime())) continue;

            const isFirstDayOfMonth = fileDate.getDate() === 1;
            const ageMs = now - fileDate.getTime();

            if (ageMs > maxAgeMs) {
              if (FindingManager.retentionPolicy.monthlySnapshots && isFirstDayOfMonth) {
                continue;
              }
              require('fs').unlinkSync(filePath);
              console.log(`🗑️ Pruned old daily history snapshot: ${file}`);
            }
          } catch (e) {}
        }
      }
    }
  }

  private updateNextIndex(id: string) {
    const match = /^([A-Z0-9\-]+)\-(\d+)$/.exec(id);
    if (match) {
      const prefix = match[1];
      const index = parseInt(match[2], 10);
      const currentMax = this.nextIndices.get(prefix) || 0;
      if (index >= currentMax) {
        this.nextIndices.set(prefix, index + 1);
      }
    }
  }

  /**
   * Generates a new unique stable sequential ID for a rule category.
   */
  private generateNewId(category: string): string {
    const prefixMap: Record<string, string> = {
      UI: 'UI-100',
      UX: 'UX',
      ACCESSIBILITY: 'A11Y',
      SECURITY: 'SEC',
      PERFORMANCE: 'PERF',
      ARCHITECTURE: 'ARCH',
      HYGIENE: 'HYG',
    };
    const prefix = prefixMap[category.toUpperCase()] || 'GEN';
    const nextIndex = this.nextIndices.get(prefix) || 1;
    this.nextIndices.set(prefix, nextIndex + 1);

    const paddedIndex = String(nextIndex).padStart(3, '0');
    return `${prefix}-${paddedIndex}`;
  }

  public getAllFindings(): Finding[] {
    return Array.from(this.findings.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  public getFinding(id: string): Finding | undefined {
    return this.findings.get(id);
  }

  public getException(id: string): FindingException | undefined {
    const exception = this.exceptions.get(id);
    if (exception && new Date(exception.expiration) > new Date()) {
      return exception;
    }
    return undefined;
  }

  public generateStableId(rule: string, path: string): string {
    const data = `${rule}:${path}`;
    const hash = createHash('sha256').update(data).digest('hex');
    return `f_${hash.substring(0, 8)}`;
  }

  /**
   * Tries to find an existing persistent finding matching a validator violation.
   */
  public matchOrCreateFinding(violation: StatelessViolation, claimedFindingIds: Set<string> = new Set()): Finding {
    const rule = RuleRegistry.getRule(violation.rule);
    const category = rule?.category || 'HYGIENE';
    const ruleVersion = rule?.version || '1.0.0';
    const engineVersion = '1.0.0';

    const path = violation.path;
    const ruleId = violation.rule;
    const findingId = this.generateStableId(ruleId, path);

    const strategy = FingerprintEngine.getStrategy('SMART');
    const fingerprint = strategy.fingerprint(ruleId, path, violation.construct || 'UIElement', violation.snippet || '');

    const occurrence: FindingOccurrence = {
      id: fingerprint,
      line: violation.line || 0,
      column: 0,
      construct: violation.construct,
      snippet: violation.snippet,
      message: violation.message,
      fingerprint,
    };

    // 1. Direct Match by stable ID (Grouped rule + path finding)
    let finding = this.findings.get(findingId);
    if (finding) {
      if (!finding.evidence.occurrences) {
        finding.evidence.occurrences = [];
      }

      // Reconcile occurrences on the first match of this finding in the run
      if (!claimedFindingIds.has(findingId)) {
        this.originalOccurrences.set(findingId, [...finding.evidence.occurrences]);
        finding.evidence.occurrences = [];
      }

      // Update primary evidence values
      finding.evidence.line = violation.line;
      finding.evidence.snippet = violation.snippet;
      finding.evidence.message = violation.message;

      // Identity = fingerprint + line (matches migrate-findings.ts semantics).
      // Two occurrences sharing the same normalized snippet but on different lines
      // are distinct source locations and must both be preserved.
      const exists = finding.evidence.occurrences.some(
        o => o.id === fingerprint && o.line === (violation.line || 0)
      );
      if (!exists) {
        finding.evidence.occurrences.push(occurrence);
        finding.evidence.occurrences.sort((a, b) => a.line - b.line);
        finding.occurrenceCount = finding.evidence.occurrences.length;
      }
      return finding;
    }

    // 2. Rename Match (Same Rule + Current Path was renamed from old Finding Path)
    for (const oldFinding of this.findings.values()) {
      if (
        oldFinding.rule === ruleId &&
        RenameDetector.wasRenamedFrom(path, oldFinding.evidence.path)
      ) {
        const oldId = oldFinding.id;
        oldFinding.id = findingId;

        // Reconcile occurrences on the first match
        if (!claimedFindingIds.has(findingId)) {
          const oldOccs = (oldFinding.evidence.occurrences || []).map(o => {
            const newFingerprint = strategy.fingerprint(ruleId, path, o.construct || 'UIElement', o.snippet || '');
            return {
              ...o,
              id: newFingerprint,
              fingerprint: newFingerprint,
            };
          });
          this.originalOccurrences.set(findingId, oldOccs);
          oldFinding.evidence.occurrences = [];
        }

        oldFinding.evidence.path = path;
        oldFinding.lastDetected = new Date().toISOString();
        oldFinding.lastModified = new Date().toISOString();

        if (!oldFinding.evidence.occurrences) {
          oldFinding.evidence.occurrences = [];
        }
        // Identity = fingerprint + line (matches migrate-findings.ts semantics).
        const exists = oldFinding.evidence.occurrences.some(
          o => o.id === fingerprint && o.line === (violation.line || 0)
        );
        if (!exists) {
          oldFinding.evidence.occurrences.push(occurrence);
          oldFinding.evidence.occurrences.sort((a, b) => a.line - b.line);
          oldFinding.occurrenceCount = oldFinding.evidence.occurrences.length;
        }

        this.findings.delete(oldId);
        this.findings.set(findingId, oldFinding);

        const oldFilePath = join(FindingManager.findingsDir, `${oldId}.json`);
        if (existsSync(oldFilePath)) {
          try {
            require('fs').unlinkSync(oldFilePath);
          } catch (e) {}
        }

        this.logHistoryEvent(findingId, {
          timestamp: new Date().toISOString(),
          action: 'RENAMED',
          status: oldFinding.status,
          notes: `File renamed/relocated from ${oldFinding.evidence.path} to ${path}`,
        });

        return oldFinding;
      }
    }

    // 3. New grouped finding
    const domain = rule?.owner || 'Platform Team';
    const firstDetected = new Date().toISOString();

    const newFinding: Finding = {
      schemaVersion: 2,
      id: findingId,
      rule: ruleId,
      ruleVersion,
      engineVersion,
      domain,
      owner: domain,
      package: path.split('/')[0] || 'root',
      feature: violation.construct || 'UIElement',
      status: 'NEW',
      confidence: violation.confidence !== undefined ? violation.confidence : (rule?.confidence || 1.0),
      relationships: [],
      evidence: {
        path,
        construct: violation.construct,
        snippet: violation.snippet,
        line: violation.line,
        message: violation.message,
        occurrences: [occurrence],
      },
      createdDate: firstDetected,
      firstDetected,
      lastDetected: firstDetected,
      occurrenceCount: 1,
    };

    this.findings.set(findingId, newFinding);
    this.logHistoryEvent(findingId, {
      timestamp: firstDetected,
      action: 'CREATED',
      status: newFinding.status,
      notes: `New grouped finding registered: ${violation.message}`,
    });

    return newFinding;
  }

  public finalizeFinding(id: string) {
    const finding = this.findings.get(id);
    if (!finding) return;

    // Check if the finding's file exists under the current status directory
    let targetDir = FindingManager.activeDir;
    if (finding.status === 'CLOSED') {
      targetDir = FindingManager.closedDir;
    } else if (finding.status === 'FALSE_POSITIVE' || finding.status === 'IGNORED') {
      targetDir = FindingManager.suppressedDir;
    }
    const targetPath = join(targetDir, `${finding.id}.json`);
    const fileExists = existsSync(targetPath);

    const original = this.originalOccurrences.get(id);
    if (!original || !fileExists) {
      // New finding, renamed finding, or file missing on disk: save it
      this.saveFinding(finding);
      return;
    }

    const current = finding.evidence.occurrences || [];
    let structurallyChanged = original.length !== current.length;

    if (!structurallyChanged) {
      for (let i = 0; i < original.length; i++) {
        const o = original[i];
        const c = current[i];
        if (
          o.id !== c.id ||
          o.line !== c.line ||
          (o.column ?? 0) !== (c.column ?? 0) ||
          (o.construct ?? '') !== (c.construct ?? '') ||
          (o.snippet ?? '') !== (c.snippet ?? '') ||
          o.message !== c.message
        ) {
          structurallyChanged = true;
          break;
        }
      }
    }

    if (structurallyChanged) {
      finding.lastDetected = new Date().toISOString();
      finding.lastModified = new Date().toISOString();
      finding.occurrenceCount = current.length;
      this.saveFinding(finding);

      this.logHistoryEvent(finding.id, {
        timestamp: finding.lastModified,
        action: 'UPDATED',
        status: finding.status,
        notes: `Occurrences updated. Active count: ${current.length}`,
      });
    } else {
      // Restore original occurrences (including original timestamps and ordering) to prevent git noise
      finding.evidence.occurrences = original;
      finding.occurrenceCount = original.length;
    }
  }

  public saveFinding(finding: Finding) {
    const previousPath = this.getFindingFilePath(finding.id);

    let targetDir = FindingManager.activeDir;
    if (finding.status === 'CLOSED') {
      const dateStr = finding.lastModified || new Date().toISOString();
      const monthFolder = dateStr.substring(0, 7); // YYYY-MM
      targetDir = join(FindingManager.closedDir, monthFolder);
    } else if (finding.status === 'FALSE_POSITIVE' || finding.status === 'IGNORED') {
      targetDir = FindingManager.suppressedDir;
    }

    const newPath = join(targetDir, `${finding.id}.json`);
    const res = writeJsonIfChanged(newPath, finding);
    if (res.written) {
      persistenceStats.findingWritten++;
    }

    if (previousPath && previousPath !== newPath && existsSync(previousPath)) {
      try {
        require('fs').unlinkSync(previousPath);
      } catch (e) {}
    }
  }

  private getFindingFilePath(id: string): string | null {
    // 1. Check active and suppressed
    const activePath = join(FindingManager.activeDir, `${id}.json`);
    if (existsSync(activePath)) return activePath;
    const suppressedPath = join(FindingManager.suppressedDir, `${id}.json`);
    if (existsSync(suppressedPath)) return suppressedPath;

    // 2. Check closed flat
    const closedFlatPath = join(FindingManager.closedDir, `${id}.json`);
    if (existsSync(closedFlatPath)) return closedFlatPath;

    // 3. Search closed subdirectories
    if (existsSync(FindingManager.closedDir)) {
      const subdirs = readdirSync(FindingManager.closedDir);
      for (const subdir of subdirs) {
        const fullSubdir = join(FindingManager.closedDir, subdir);
        if (statSync(fullSubdir).isDirectory()) {
          const checkPath = join(fullSubdir, `${id}.json`);
          if (existsSync(checkPath)) return checkPath;
        }
      }
    }
    return null;
  }

  public logHistoryEvent(id: string, event: HistoryEvent) {
    const historyPath = join(FindingManager.historyDir, `${id}.json`);
    let historyRecord = { id, history: [] as HistoryEvent[] };

    if (existsSync(historyPath)) {
      try {
        const content = readFileSync(historyPath, 'utf8');
        historyRecord = JSON.parse(content);
      } catch (e) {
        // Ignore parsing errors and start fresh
      }
    }

    historyRecord.history.push(event);
    writeJsonIfChanged(historyPath, historyRecord);
  }

  public getHistory(id: string): HistoryEvent[] {
    const historyPath = join(FindingManager.historyDir, `${id}.json`);
    if (existsSync(historyPath)) {
      try {
        const content = readFileSync(historyPath, 'utf8');
        return JSON.parse(content).history || [];
      } catch (e) {
        // Fallback to empty history
      }
    }
    return [];
  }
}
export const govDir = resolve(__dirname, '../../..', '.governance');
export const baselinesDir = join(govDir, 'baselines');
export const metricsDir = join(govDir, 'metrics');

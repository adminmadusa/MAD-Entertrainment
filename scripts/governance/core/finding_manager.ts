// scripts/governance/core/finding_manager.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { Finding, FindingException, FindingStatus, HistoryEvent, StatelessViolation } from './types';
import { RuleRegistry } from '../rules/registry';
import { RenameDetector } from './rename_detector';

export class FindingManager {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static govDir = resolve(FindingManager.workspaceRoot, '.governance');
  private static findingsDir = join(FindingManager.govDir, 'findings');
  private static exceptionsDir = join(FindingManager.govDir, 'exceptions');
  private static historyDir = join(FindingManager.govDir, 'history');
  private static baselinesDir = join(FindingManager.govDir, 'baselines');
  private static metricsDir = join(FindingManager.govDir, 'metrics');

  private findings = new Map<string, Finding>();
  private exceptions = new Map<string, FindingException>();
  private nextIndices = new Map<string, number>();

  constructor() {
    this.ensureDirectoriesExist();
    this.loadAll();
  }

  private ensureDirectoriesExist() {
    const dirs = [
      FindingManager.govDir,
      FindingManager.findingsDir,
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
    // 1. Load Exceptions
    if (existsSync(FindingManager.exceptionsDir)) {
      const files = readdirSync(FindingManager.exceptionsDir);
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

    // 2. Load Findings
    if (existsSync(FindingManager.findingsDir)) {
      const files = readdirSync(FindingManager.findingsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = readFileSync(join(FindingManager.findingsDir, file), 'utf8');
            const finding = JSON.parse(content) as Finding;
            this.findings.set(finding.id, finding);
            this.updateNextIndex(finding.id);
          } catch (e) {
            // Ignore bad finding JSONs
          }
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
    return Array.from(this.findings.values());
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

  /**
   * Tries to find an existing persistent finding matching a validator violation.
   */
  public matchOrCreateFinding(violation: StatelessViolation): Finding {
    const rule = RuleRegistry.getRule(violation.rule);
    const category = rule?.category || 'HYGIENE';
    const ruleVersion = rule?.version || '1.0.0';
    const engineVersion = '1.0.0';

    // 1. Precise Match (Same Rule + Same Path + Same Construct)
    for (const finding of this.findings.values()) {
      if (
        finding.rule === violation.rule &&
        finding.evidence.path === violation.path &&
        finding.evidence.construct === violation.construct
      ) {
        // Update lines, snippet, and messages in memory (evidence updates)
        finding.evidence.line = violation.line;
        finding.evidence.snippet = violation.snippet;
        finding.evidence.message = violation.message;
        finding.lastDetected = new Date().toISOString();
        return finding;
      }
    }

    // 2. Rename Match (Same Rule + Same Construct + Current Path was renamed from Finding Path)
    for (const finding of this.findings.values()) {
      if (
        finding.rule === violation.rule &&
        finding.evidence.construct === violation.construct &&
        RenameDetector.wasRenamedFrom(violation.path, finding.evidence.path)
      ) {
        // Update path to the new path, logging the path evolution
        finding.evidence.path = violation.path;
        finding.evidence.line = violation.line;
        finding.evidence.snippet = violation.snippet;
        finding.evidence.message = violation.message;
        finding.lastDetected = new Date().toISOString();
        this.saveFinding(finding); // Save updated file paths immediately
        this.logHistoryEvent(finding.id, {
          timestamp: new Date().toISOString(),
          action: 'RENAMED',
          status: finding.status,
          notes: `File renamed/relocated to ${violation.path}`,
        });
        return finding;
      }
    }

    // 3. Match failed: generate a new persistent finding
    const newId = this.generateNewId(category);
    const domain = rule?.owner || 'Platform Team';
    const firstDetected = new Date().toISOString();

    const newFinding: Finding = {
      id: newId,
      rule: violation.rule,
      ruleVersion,
      engineVersion,
      domain,
      owner: rule?.owner || 'Platform Team',
      package: violation.path.split('/')[0] || 'shared',
      feature: violation.construct || 'General',
      status: rule?.defaultLifecycle || 'NEW',
      confidence: violation.confidence !== undefined ? violation.confidence : (rule?.confidence || 1.0),
      relationships: [],
      evidence: {
        path: violation.path,
        construct: violation.construct,
        snippet: violation.snippet,
        line: violation.line,
        message: violation.message,
      },
      createdDate: firstDetected,
      firstDetected,
      lastDetected: firstDetected,
    };

    // Save records
    this.findings.set(newId, newFinding);
    this.saveFinding(newFinding);
    this.logHistoryEvent(newId, {
      timestamp: firstDetected,
      action: 'CREATED',
      status: newFinding.status,
      notes: `New finding registered: ${violation.message}`,
    });

    return newFinding;
  }

  public saveFinding(finding: Finding) {
    const filePath = join(FindingManager.findingsDir, `${finding.id}.json`);
    writeFileSync(filePath, JSON.stringify(finding, null, 2), 'utf8');
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
    writeFileSync(historyPath, JSON.stringify(historyRecord, null, 2), 'utf8');
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

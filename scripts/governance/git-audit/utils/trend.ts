import fs from 'fs';
import path from 'path';
import type { ScoreReport } from './scoring';

// Stable schema versions for trend history tracking
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const CURRENT_ENGINE_VERSION = '1.0.0';

export interface HistoricalSnapshot {
  readonly timestamp: string;
  readonly schemaVersion: string;
  readonly engineVersion: string;
  readonly scores: Omit<ScoreReport, 'deductions'>;
}

export interface TrendHistoryFile {
  readonly schemaVersion: string;
  readonly engineVersion: string;
  readonly history: HistoricalSnapshot[];
}

export interface ScoreDelta {
  readonly scoreName: string;
  readonly previous: number | null;
  readonly current: number;
  readonly delta: number | null;
}

export interface TrendDeltas {
  readonly overall: ScoreDelta;
  readonly branchHygiene: ScoreDelta;
  readonly repositoryHealth: ScoreDelta;
  readonly technicalDebt: ScoreDelta;
  readonly gitGovernance: ScoreDelta;
}

/**
 * Pure helper utility to compare two score sets and produce structured deltas.
 * Contains zero I/O or Git operations.
 */
export class TrendCalculator {
  public static calculateDeltas(
    currentScores: Omit<ScoreReport, 'deductions'>,
    previousSnapshot: HistoricalSnapshot | null
  ): TrendDeltas {
    const prev = previousSnapshot?.scores || null;

    const makeDelta = (
      name: string,
      currVal: number,
      prevVal: number | null
    ): ScoreDelta => {
      const delta = prevVal !== null ? currVal - prevVal : null;
      return {
        scoreName: name,
        previous: prevVal,
        current: currVal,
        delta,
      };
    };

    return {
      overall: makeDelta('Overall Score', currentScores.overallScore, prev ? prev.overallScore : null),
      branchHygiene: makeDelta('Branch Hygiene', currentScores.branchHygieneScore, prev ? prev.branchHygieneScore : null),
      repositoryHealth: makeDelta('Repository Health', currentScores.repositoryHealthScore, prev ? prev.repositoryHealthScore : null),
      technicalDebt: makeDelta('Technical Debt', currentScores.technicalDebtScore, prev ? prev.technicalDebtScore : null),
      gitGovernance: makeDelta('Git Governance', currentScores.gitGovernanceScore, prev ? prev.gitGovernanceScore : null),
    };
  }
}

/**
 * Handles trend serialization and deserialization relative to the repository root.
 * Recovers from schema mismatches, parsing issues, or missing files.
 */
export class TrendStore {
  private readonly filepath: string;

  constructor(repoRoot: string) {
    this.filepath = path.resolve(repoRoot, '.agents/trend_report.json');
  }

  /**
   * Loads the history file. Returns a valid TrendHistoryFile structure even
   * if the file is missing, corrupt, or has a schema version mismatch.
   */
  public load(): TrendHistoryFile {
    if (!fs.existsSync(this.filepath)) {
      return this.emptyHistory();
    }

    try {
      const raw = fs.readFileSync(this.filepath, 'utf8');
      const data = JSON.parse(raw);

      if (!data || typeof data !== 'object' || !Array.isArray(data.history)) {
        console.warn('⚠️ Malformed trend history format. Resetting history.');
        return this.emptyHistory();
      }

      if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        console.warn(`⚠️ Trend schema mismatch (found: ${data.schemaVersion}, expected: ${CURRENT_SCHEMA_VERSION}). Resetting history.`);
        return this.emptyHistory();
      }

      return data as TrendHistoryFile;
    } catch (e) {
      console.warn('⚠️ Failed to parse trend history JSON. Recovering by resetting history.', e);
      return this.emptyHistory();
    }
  }

  /**
   * Appends a new snapshot to history, trims to limit, and writes back to disk.
   */
  public save(
    currentScores: Omit<ScoreReport, 'deductions'>,
    historyLimit: number
  ): HistoricalSnapshot {
    const data = this.load();

    const snapshot: HistoricalSnapshot = {
      timestamp: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      engineVersion: CURRENT_ENGINE_VERSION,
      scores: {
        overallScore: currentScores.overallScore,
        branchHygieneScore: currentScores.branchHygieneScore,
        repositoryHealthScore: currentScores.repositoryHealthScore,
        technicalDebtScore: currentScores.technicalDebtScore,
        gitGovernanceScore: currentScores.gitGovernanceScore,
      },
    };

    // Filter out duplicate timestamps if they somehow happen in the same execution run
    let history = data.history.filter(h => h.timestamp !== snapshot.timestamp);
    history.push(snapshot);

    // Trim history to limit
    const limit = Math.max(1, historyLimit);
    if (history.length > limit) {
      history = history.slice(history.length - limit);
    }

    const updated: TrendHistoryFile = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      engineVersion: CURRENT_ENGINE_VERSION,
      history,
    };

    const dir = path.dirname(this.filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.filepath, JSON.stringify(updated, null, 2), 'utf8');

    return snapshot;
  }

  private emptyHistory(): TrendHistoryFile {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      engineVersion: CURRENT_ENGINE_VERSION,
      history: [],
    };
  }
}

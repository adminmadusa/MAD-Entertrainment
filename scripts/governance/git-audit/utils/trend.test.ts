import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TrendCalculator, TrendStore, CURRENT_SCHEMA_VERSION, CURRENT_ENGINE_VERSION } from './trend';
import type { ScoreReport } from './scoring';

// Helper to construct score object
function makeScores(overall: number, hygiene: number, health: number, debt: number, gov: number): Omit<ScoreReport, 'deductions'> {
  return {
    overallScore: overall,
    branchHygieneScore: hygiene,
    repositoryHealthScore: health,
    technicalDebtScore: debt,
    gitGovernanceScore: gov,
  };
}

describe('TrendCalculator (Pure delta calculation)', () => {
  it('should handle first run (previous snapshot is null)', () => {
    const current = makeScores(70, 80, 90, 60, 50);
    const deltas = TrendCalculator.calculateDeltas(current, null);

    expect(deltas.overall.delta).toBeNull();
    expect(deltas.overall.previous).toBeNull();
    expect(deltas.overall.current).toBe(70);

    expect(deltas.branchHygiene.delta).toBeNull();
    expect(deltas.branchHygiene.previous).toBeNull();
    expect(deltas.branchHygiene.current).toBe(80);
  });

  it('should calculate positive, negative, and neutral deltas correctly', () => {
    const prevSnapshot = {
      timestamp: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      engineVersion: CURRENT_ENGINE_VERSION,
      scores: makeScores(70, 80, 90, 60, 50),
    };

    // Overall: +5 (75-70)
    // Hygiene: -10 (70-80)
    // Health:  0 (90-90)
    // Debt:    +15 (75-60)
    // Gov:     -5 (45-50)
    const current = makeScores(75, 70, 90, 75, 45);
    const deltas = TrendCalculator.calculateDeltas(current, prevSnapshot);

    expect(deltas.overall.delta).toBe(5);
    expect(deltas.overall.previous).toBe(70);
    expect(deltas.overall.current).toBe(75);

    expect(deltas.branchHygiene.delta).toBe(-10);
    expect(deltas.branchHygiene.previous).toBe(80);
    expect(deltas.branchHygiene.current).toBe(70);

    expect(deltas.repositoryHealth.delta).toBe(0);
    expect(deltas.repositoryHealth.previous).toBe(90);
    expect(deltas.repositoryHealth.current).toBe(90);

    expect(deltas.technicalDebt.delta).toBe(15);
    expect(deltas.technicalDebt.previous).toBe(60);
    expect(deltas.technicalDebt.current).toBe(75);

    expect(deltas.gitGovernance.delta).toBe(-5);
    expect(deltas.gitGovernance.previous).toBe(50);
    expect(deltas.gitGovernance.current).toBe(45);
  });
});

describe('TrendStore (File persistence and error recovery)', () => {
  const tempDir = path.resolve(__dirname, '../../../../tmp/trend-test');
  const store = new TrendStore(tempDir);

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should load empty history if file does not exist', () => {
    const data = store.load();
    expect(data.history).toHaveLength(0);
    expect(data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(data.engineVersion).toBe(CURRENT_ENGINE_VERSION);
  });

  it('should successfully save and reload history', () => {
    const scores = makeScores(70, 80, 90, 60, 50);
    const snapshot = store.save(scores, 50);

    expect(snapshot.scores.overallScore).toBe(70);
    expect(snapshot.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    const reloaded = store.load();
    expect(reloaded.history).toHaveLength(1);
    expect(reloaded.history[0].scores.overallScore).toBe(70);
    expect(reloaded.history[0].timestamp).toBe(snapshot.timestamp);
  });

  it('should recover gracefully from malformed JSON file', () => {
    const file = path.resolve(tempDir, '.agents/trend_report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'invalid json content }', 'utf8');

    // Should load empty history without throwing
    const data = store.load();
    expect(data.history).toHaveLength(0);
  });

  it('should recover gracefully from schema version mismatch', () => {
    const file = path.resolve(tempDir, '.agents/trend_report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: '0.1.0', // outdated/mismatched version
        engineVersion: '1.0.0',
        history: [{ timestamp: '2026-07-04T12:00:00Z', scores: makeScores(70, 70, 70, 70, 70) }],
      }),
      'utf8'
    );

    // Should ignore existing items and reset history
    const data = store.load();
    expect(data.history).toHaveLength(0);
  });

  it('should limit history size to trendHistoryLimit (truncation)', () => {
    const limit = 3;
    const originalToISOString = Date.prototype.toISOString;
    let counter = 0;
    Date.prototype.toISOString = () => `2026-07-04T12:00:0${counter++}.000Z`;

    try {
      store.save(makeScores(10, 10, 10, 10, 10), limit);
      store.save(makeScores(20, 20, 20, 20, 20), limit);
      store.save(makeScores(30, 30, 30, 30, 30), limit);
      store.save(makeScores(40, 40, 40, 40, 40), limit); // 4th write exceeds limit of 3

      const data = store.load();
      expect(data.history).toHaveLength(3);
      // Oldest item (10) should have been truncated. The 3 remaining should be 20, 30, 40.
      expect(data.history[0].scores.overallScore).toBe(20);
      expect(data.history[1].scores.overallScore).toBe(30);
      expect(data.history[2].scores.overallScore).toBe(40);
    } finally {
      Date.prototype.toISOString = originalToISOString;
    }
  });

  it('should deduplicate multiple entries with the identical timestamp', () => {
    // Stub Date.prototype.toISOString to return a fixed timestamp
    const fixedTime = '2026-07-04T12:00:00.000Z';
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = () => fixedTime;

    try {
      store.save(makeScores(50, 50, 50, 50, 50), 50);
      store.save(makeScores(60, 60, 60, 60, 60), 50); // Same timestamp, should overwrite previous

      const data = store.load();
      expect(data.history).toHaveLength(1);
      expect(data.history[0].scores.overallScore).toBe(60); // has updated score
    } finally {
      Date.prototype.toISOString = originalToISOString;
    }
  });

  it('should backup corrupted JSON to .corrupt.json and reset', () => {
    const file = path.resolve(tempDir, '.agents/trend_report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'corrupt text', 'utf8');

    const data = store.load();
    expect(data.history).toHaveLength(0);

    const backupFile = path.resolve(tempDir, '.agents/trend_report.corrupt.json');
    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.readFileSync(backupFile, 'utf8')).toBe('corrupt text');
  });

  it('should backup schema mismatches to .schema-v{version}.json and reset', () => {
    const file = path.resolve(tempDir, '.agents/trend_report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    
    const mismatchedData = {
      schemaVersion: '2.5.9',
      engineVersion: '1.0.0',
      history: [{ timestamp: '2026-07-04T12:00:00Z', scores: makeScores(70, 70, 70, 70, 70) }]
    };
    fs.writeFileSync(file, JSON.stringify(mismatchedData, null, 2), 'utf8');

    const data = store.load();
    expect(data.history).toHaveLength(0);

    const backupFile = path.resolve(tempDir, '.agents/trend_report.schema-v2.5.9.json');
    expect(fs.existsSync(backupFile)).toBe(true);
    const backupContent = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    expect(backupContent.schemaVersion).toBe('2.5.9');
  });

  it('should log warning and preserve history if engineVersion changes but schemaVersion remains compatible', () => {
    const file = path.resolve(tempDir, '.agents/trend_report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });

    const dataWithEngineMismatch = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      engineVersion: '2.9.9', // mismatch
      history: [{ timestamp: '2026-07-04T12:00:00Z', scores: makeScores(85, 85, 85, 85, 85) }]
    };
    fs.writeFileSync(file, JSON.stringify(dataWithEngineMismatch, null, 2), 'utf8');

    const data = store.load();
    // Engine version mismatch must preserve history (not reset it)
    expect(data.history).toHaveLength(1);
    expect(data.history[0].scores.overallScore).toBe(85);
  });
});

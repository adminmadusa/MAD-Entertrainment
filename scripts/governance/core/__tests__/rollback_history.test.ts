// scripts/governance/core/__tests__/rollback_history.test.ts
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeJsonIfChanged } from '../json_utils';
import { RollbackHistory } from '../rollback_history';
import type { RollbackBackup } from '../rollback_manager';

const workspaceRoot = resolve(__dirname, '../../../../..');
const sandboxBackupsDir = resolve(workspaceRoot, '.governance/autofix/backups');

describe('RollbackHistory', () => {
  beforeEach(() => {
    if (existsSync(sandboxBackupsDir)) {
      rmSync(sandboxBackupsDir, { recursive: true, force: true });
    }
    mkdirSync(sandboxBackupsDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(sandboxBackupsDir)) {
      rmSync(sandboxBackupsDir, { recursive: true, force: true });
    }
  });

  it('lists rollback backups correctly', () => {
    const b1: RollbackBackup = {
      id: 'rollback-1',
      timestamp: '2026-07-03T10:00:00.000Z',
      files: { 'file1.md': 'original content 1' },
      restored: false,
    };

    const b2: RollbackBackup = {
      id: 'rollback-2',
      timestamp: '2026-07-03T11:00:00.000Z',
      files: { 'file2.md': 'original content 2' },
      restored: true,
    };

    writeJsonIfChanged(join(sandboxBackupsDir, '1-rollback.json'), b1);
    writeJsonIfChanged(join(sandboxBackupsDir, '2-rollback.json'), b2);

    const list = RollbackHistory.list(workspaceRoot);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('rollback-2'); // Sorted newest timestamp first
    expect(list[1].id).toBe('rollback-1');
  });

  it('finds specific rollback by ID', () => {
    const backup: RollbackBackup = {
      id: 'rollback-target',
      timestamp: new Date().toISOString(),
      files: { 'file.md': 'content' },
      restored: false,
    };

    writeJsonIfChanged(join(sandboxBackupsDir, 'target-rollback.json'), backup);

    const found = RollbackHistory.find(workspaceRoot, 'rollback-target');
    expect(found).toBeDefined();
    expect(found?.id).toBe('rollback-target');
  });

  it('findLatestActive returns the latest unrestored backup', () => {
    const b1: RollbackBackup = {
      id: 'rollback-1',
      timestamp: '2026-07-03T10:00:00.000Z',
      files: { 'file1.md': 'original content 1' },
      restored: false,
    };

    const b2: RollbackBackup = {
      id: 'rollback-2',
      timestamp: '2026-07-03T11:00:00.000Z',
      files: { 'file2.md': 'original content 2' },
      restored: true,
    };

    writeJsonIfChanged(join(sandboxBackupsDir, '1-rollback.json'), b1);
    writeJsonIfChanged(join(sandboxBackupsDir, '2-rollback.json'), b2);

    const latestActive = RollbackHistory.findLatestActive(workspaceRoot);
    expect(latestActive).toBeDefined();
    expect(latestActive?.id).toBe('rollback-1'); // rollback-2 is restored, so rollback-1 is latest active
  });
});

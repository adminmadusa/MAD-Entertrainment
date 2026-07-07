// scripts/governance/core/__tests__/recovery_manager.test.ts
import { createHash } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ShellGitMetadataProvider } from '../git_metadata_provider';
import { writeJsonIfChanged } from '../json_utils';
import { RecoveryManager } from '../recovery_manager';
import type { RollbackBackup } from '../rollback_manager';
import { SessionStore, type SessionMetadata } from '../session_store';

const workspaceRoot = resolve(process.cwd(), 'temp-tests/recovery-manager');
const sandboxSessionsDir = resolve(workspaceRoot, '.governance/autofix/sessions');
const sandboxBackupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
const testFile = join(workspaceRoot, 'recovery-test-file.md');

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('RecoveryManager', () => {
  let store: SessionStore;
  let rm: RecoveryManager;

  beforeEach(() => {
    if (existsSync(workspaceRoot)) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
    mkdirSync(sandboxSessionsDir, { recursive: true });
    mkdirSync(sandboxBackupsDir, { recursive: true });

    store = new SessionStore(workspaceRoot);
    rm = new RecoveryManager(workspaceRoot);

    if (existsSync(testFile)) {
      rmSync(testFile, { force: true });
    }
  });

  afterEach(() => {
    if (existsSync(workspaceRoot)) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
    const parentDir = resolve(workspaceRoot, '..');
    if (existsSync(parentDir)) {
      try {
        const files = readdirSync(parentDir);
        if (files.length === 0) {
          rmSync(parentDir, { recursive: true, force: true });
        }
      } catch (e) {}
    }
  });

  it('detects interrupted sessions successfully', () => {
    const s1: SessionMetadata = {
      sessionId: 's1',
      startedAt: new Date().toISOString(),
      executionMode: 'STANDARD',
      interactive: false,
      preview: false,
      dryRun: false,
      safeOnly: false,
      gitBranch: 'develop',
      gitCommit: 'abc1234',
      gitDirty: false,
      modifiedFiles: [],
      fileHashes: {},
      closedFindings: [],
      reopenedFindings: [],
      approvedViolations: [],
      status: 'INTERRUPTED',
    };

    store.save(s1);

    const active = rm.detectInterruptedSession();
    expect(active).toBeDefined();
    expect(active?.sessionId).toBe('s1');
  });

  it('verifyResumeAllowed passes when files match and rollback is present', () => {
    const originalContent = 'original text content';
    writeFileSync(testFile, originalContent, 'utf8');

    const rollback: RollbackBackup = {
      id: 'rollback-s1',
      timestamp: new Date().toISOString(),
      files: { 'recovery-test-file.md': originalContent },
      restored: false,
    };
    writeJsonIfChanged(join(sandboxBackupsDir, 's1-rollback.json'), rollback);

    const session: SessionMetadata = {
      sessionId: 'session-s1',
      startedAt: new Date().toISOString(),
      executionMode: 'STANDARD',
      interactive: false,
      preview: false,
      dryRun: false,
      safeOnly: false,
      gitBranch: 'develop',
      gitCommit: 'abc1234',
      gitDirty: false,
      modifiedFiles: ['recovery-test-file.md'],
      fileHashes: { 'recovery-test-file.md': computeHash(originalContent) },
      closedFindings: [],
      reopenedFindings: [],
      approvedViolations: [],
      rollbackId: 'rollback-s1',
      status: 'INTERRUPTED',
    };

    const res = rm.verifyResumeAllowed(session);
    expect(res.allowed).toBe(true);
  });

  it('verifyResumeAllowed fails when unmodified file hash differs', () => {
    const originalContent = 'original text content';
    writeFileSync(testFile, 'changed externally!', 'utf8');

    const rollback: RollbackBackup = {
      id: 'rollback-s1',
      timestamp: new Date().toISOString(),
      files: { 'recovery-test-file.md': originalContent },
      restored: false,
    };
    writeJsonIfChanged(join(sandboxBackupsDir, 's1-rollback.json'), rollback);

    const session: SessionMetadata = {
      sessionId: 'session-s1',
      startedAt: new Date().toISOString(),
      executionMode: 'STANDARD',
      interactive: false,
      preview: false,
      dryRun: false,
      safeOnly: false,
      gitBranch: 'develop',
      gitCommit: 'abc1234',
      gitDirty: false,
      modifiedFiles: [], // Marked unmodified by session
      fileHashes: { 'recovery-test-file.md': computeHash(originalContent) },
      closedFindings: [],
      reopenedFindings: [],
      approvedViolations: [],
      rollbackId: 'rollback-s1',
      status: 'INTERRUPTED',
    };

    const res = rm.verifyResumeAllowed(session);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('changed externally');
  });

  it('verifyRepositoryState matches when git details match', () => {
    const session: SessionMetadata = {
      sessionId: 'session-s1',
      startedAt: new Date().toISOString(),
      executionMode: 'STANDARD',
      interactive: false,
      preview: false,
      dryRun: false,
      safeOnly: false,
      gitBranch: 'develop',
      gitCommit: 'abc1234',
      gitDirty: false,
      modifiedFiles: [],
      fileHashes: {},
      closedFindings: [],
      reopenedFindings: [],
      approvedViolations: [],
      status: 'INTERRUPTED',
    };

    const state = rm.verifyRepositoryState(session, {
      branch: 'develop',
      commit: 'abc1234',
      isDirty: false,
    });
    expect(state.matches).toBe(true);
  });
});

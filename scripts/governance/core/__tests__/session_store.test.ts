// scripts/governance/core/__tests__/session_store.test.ts
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionStore, type SessionMetadata } from '../session_store';

const workspaceRoot = resolve(process.cwd(), 'temp-tests/session-store');
const sandboxSessionsDir = resolve(workspaceRoot, '.governance/autofix/sessions');

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    if (existsSync(sandboxSessionsDir)) {
      rmSync(sandboxSessionsDir, { recursive: true, force: true });
    }
    store = new SessionStore(workspaceRoot);
  });

  afterEach(() => {
    if (existsSync(sandboxSessionsDir)) {
      rmSync(sandboxSessionsDir, { recursive: true, force: true });
    }
  });

  it('saves and loads session metadata correctly', () => {
    const session: SessionMetadata = {
      sessionId: 'test-session-123',
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
      status: 'CREATED',
    };

    store.save(session);
    const loaded = store.load('test-session-123');
    expect(loaded).toBeDefined();
    expect(loaded?.sessionId).toBe('test-session-123');
    expect(loaded?.status).toBe('CREATED');
  });

  it('lists sessions sorted by startedAt descending', () => {
    const s1: SessionMetadata = {
      sessionId: 's1',
      startedAt: '2026-07-03T10:00:00.000Z',
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
      status: 'COMPLETED',
    };

    const s2: SessionMetadata = {
      sessionId: 's2',
      startedAt: '2026-07-03T11:00:00.000Z',
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
    store.save(s2);

    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list[0].sessionId).toBe('s2'); // Newest first
    expect(list[1].sessionId).toBe('s1');
  });

  it('deletes session metadata correctly', () => {
    const session: SessionMetadata = {
      sessionId: 'del-session',
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
      status: 'CREATED',
    };

    store.save(session);
    expect(store.load('del-session')).toBeDefined();

    const success = store.delete('del-session');
    expect(success).toBe(true);
    expect(store.load('del-session')).toBeUndefined();
  });

  it('loadActive returns the latest active session', () => {
    const s1: SessionMetadata = {
      sessionId: 's1',
      startedAt: '2026-07-03T10:00:00.000Z',
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
      status: 'COMPLETED',
    };

    const s2: SessionMetadata = {
      sessionId: 's2',
      startedAt: '2026-07-03T11:00:00.000Z',
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
    store.save(s2);

    const active = store.loadActive();
    expect(active).toBeDefined();
    expect(active?.sessionId).toBe('s2');
  });
});

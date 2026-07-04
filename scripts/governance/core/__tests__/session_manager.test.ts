// scripts/governance/core/__tests__/session_manager.test.ts
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionMode } from '../execution_mode';
import { FixContext } from '../fix_context';
import { SessionManager } from '../session_manager';
import { SessionStore } from '../session_store';
import type { StatelessViolation } from '../types';

const workspaceRoot = resolve(process.cwd(), 'temp-tests/session-manager');
const sandboxSessionsDir = resolve(workspaceRoot, '.governance/autofix/sessions');

vi.mock('../execution_engine', () => {
  return {
    ExecutionEngine: {
      execute: vi.fn().mockResolvedValue({ results: [] }),
    },
  };
});

describe('SessionManager', () => {
  let sm: SessionManager;
  let store: SessionStore;

  beforeEach(() => {
    if (existsSync(sandboxSessionsDir)) {
      rmSync(sandboxSessionsDir, { recursive: true, force: true });
    }
    sm = new SessionManager(workspaceRoot);
    store = new SessionStore(workspaceRoot);
  });

  afterEach(() => {
    if (existsSync(sandboxSessionsDir)) {
      rmSync(sandboxSessionsDir, { recursive: true, force: true });
    }
  });

  it('starts a session with CREATED status', async () => {
    const ctx = new FixContext({ workspaceRoot });
    const session = await sm.startSession(ExecutionMode.STANDARD, ctx);

    expect(session).toBeDefined();
    expect(session.status).toBe('CREATED');
    expect(session.gitBranch).toBeDefined();
  });

  it('transitions state to RUNNING on resume', async () => {
    const ctx = new FixContext({ workspaceRoot });
    const session = await sm.startSession(ExecutionMode.STANDARD, ctx);
    sm.resumeSession(session);

    expect(session.status).toBe('RUNNING');
    const loaded = store.load(session.sessionId);
    expect(loaded?.status).toBe('RUNNING');
  });

  it('records file modification incrementally during onFixApplied', async () => {
    const ctx = new FixContext({ workspaceRoot });
    const session = await sm.startSession(ExecutionMode.STANDARD, ctx);
    sm.resumeSession(session);

    const violation: StatelessViolation = {
      rule: 'VAL-DOC-001',
      path: 'some-file.md',
      construct: 'Document',
      confidence: 1.0,
    };

    sm.onFixApplied(violation, {} as any, {
      ruleId: 'VAL-DOC-001',
      filePath: 'some-file.md',
      success: true,
      applied: true,
      safety: 'SAFE',
    });

    expect(session.modifiedFiles).toContain('some-file.md');
    const loaded = store.load(session.sessionId);
    expect(loaded?.modifiedFiles).toContain('some-file.md');
  });

  it('completes the session correctly', async () => {
    const ctx = new FixContext({ workspaceRoot });
    const session = await sm.startSession(ExecutionMode.STANDARD, ctx);
    sm.resumeSession(session);

    sm.completeSession(
      { applied: 1, modifiedFiles: ['some-file.md'] },
      { findingsClosed: ['finding-1'], findingsReopened: [] }
    );

    const loaded = store.load(session.sessionId);
    expect(loaded?.status).toBe('COMPLETED');
    expect(loaded?.closedFindings).toContain('finding-1');
  });
});

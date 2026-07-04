// scripts/governance/core/session_store.ts
import { existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

import { readJsonIfExists, writeJsonIfChanged } from './json_utils';

export interface SessionMetadata {
  sessionId: string;
  startedAt: string;
  finishedAt?: string;
  executionMode: string;
  interactive: boolean;
  preview: boolean;
  dryRun: boolean;
  safeOnly: boolean;
  rollbackId?: string;
  verificationId?: string;
  gitBranch: string;
  gitCommit: string;
  gitDirty: boolean;
  modifiedFiles: string[];
  fileHashes: Record<string, string>; // filePath -> pre-fix SHA256 content hash
  closedFindings: string[];
  reopenedFindings: string[];
  approvedViolations: string[]; // "ruleId:filePath"
  status: 'CREATED' | 'RUNNING' | 'INTERRUPTED' | 'COMPLETED' | 'ROLLED_BACK' | 'CANCELLED';
}

/**
 * Handles read/write/list operations for session metadata JSON files
 * stored under `.governance/autofix/sessions/`.
 *
 * Employs writeJsonIfChanged to guarantee atomic, sorted, and safe writes.
 */
export class SessionStore {
  private readonly sessionsDir: string;

  constructor(workspaceRoot: string) {
    this.sessionsDir = resolve(workspaceRoot, '.governance/autofix/sessions');
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Persists session metadata atomically.
   */
  public save(session: SessionMetadata): void {
    const filePath = join(this.sessionsDir, `${session.sessionId}.json`);
    writeJsonIfChanged(filePath, session);
  }

  /**
   * Loads a specific session by ID.
   */
  public load(sessionId: string): SessionMetadata | undefined {
    const filePath = join(this.sessionsDir, `${sessionId}.json`);
    return readJsonIfExists<SessionMetadata>(filePath);
  }

  /**
   * Lists all sessions, ordered chronologically (newest first).
   */
  public list(): SessionMetadata[] {
    if (!existsSync(this.sessionsDir)) return [];

    return readdirSync(this.sessionsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => readJsonIfExists<SessionMetadata>(join(this.sessionsDir, f)))
      .filter((s): s is SessionMetadata => !!s)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Deletes a session by ID.
   */
  public delete(sessionId: string): boolean {
    const filePath = join(this.sessionsDir, `${sessionId}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Resolves the latest active, runnable, or interrupted session.
   */
  public loadActive(): SessionMetadata | undefined {
    return this.list().find(
      s => s.status === 'CREATED' || s.status === 'RUNNING' || s.status === 'INTERRUPTED'
    );
  }
}

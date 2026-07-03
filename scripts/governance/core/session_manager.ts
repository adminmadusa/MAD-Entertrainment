// scripts/governance/core/session_manager.ts
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { AuditEngine } from './audit_engine';
import { AutoFixObserver } from './autofix_observer';
import { ExecutionEngine } from './execution_engine';
import { ExecutionMode } from './execution_mode';
import type { FixContext } from './fix_context';
import { FixRegistry } from './fix_registry';
import type { Fixer, FixResultItem } from './fix_types';
import { ShellGitMetadataProvider } from './git_metadata_provider';
import { MetadataProvider } from './metadata';
import { SessionStore, type SessionMetadata } from './session_store';
import type { StatelessViolation } from './types';

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function getFileHash(fullPath: string): string {
  if (!existsSync(fullPath)) return '';
  try {
    const content = readFileSync(fullPath, 'utf8');
    return computeHash(content);
  } catch {
    return '';
  }
}

export class SessionManager implements AutoFixObserver {
  private readonly store: SessionStore;
  private readonly gitProvider: ShellGitMetadataProvider;
  private activeSession: SessionMetadata | null = null;

  constructor(private readonly workspaceRoot: string) {
    this.store = new SessionStore(workspaceRoot);
    this.gitProvider = new ShellGitMetadataProvider(workspaceRoot);
  }

  public getActiveSession(): SessionMetadata | null {
    return this.activeSession;
  }

  /**
   * Starts a new auto-fix session, generating a session ID, calculating initial
   * file hashes, and saving the session state as CREATED.
   */
  public async startSession(
    mode: ExecutionMode,
    context: FixContext,
    approvedViolations?: string[]
  ): Promise<SessionMetadata> {
    const sessionId = `session-${Date.now()}`;
    const git = this.gitProvider.getMetadata();

    // 1. Pre-scan to discover target files and record their initial pre-fix hashes
    const fileHashes: Record<string, string> = {};
    try {
      const metadataProvider = new MetadataProvider();
      const metadata = metadataProvider.getMetadata();
      const auditEngine = new AuditEngine();
      metadata.knowledgeGraph = auditEngine.getKnowledgeGraph();
      const allFiles = auditEngine.getKnowledgeGraph().getIndexedFiles();

      const filters: { rules?: string[] } = {};
      if (context.rule) {
        filters.rules = [context.rule];
      }

      const report = await ExecutionEngine.execute(allFiles, metadata, filters);

      for (const res of report.results) {
        const allErrors = [...res.errors, ...res.warnings];
        for (const err of allErrors) {
          if (context.rule && err.rule !== context.rule) continue;
          if (context.path) {
            const resolvedFilePath = resolve(this.workspaceRoot, err.file);
            const resolvedFilter = resolve(this.workspaceRoot, context.path);
            if (!resolvedFilePath.startsWith(resolvedFilter)) continue;
          }
          if (!FixRegistry.supports(err.rule)) continue;

          // Compute pre-fix hash of the target file
          if (!fileHashes[err.file]) {
            const fullPath = resolve(this.workspaceRoot, err.file);
            fileHashes[err.file] = getFileHash(fullPath);
          }
        }
      }
    } catch {
      // Ignore scan failures during startup and proceed with empty hashes
    }

    const session: SessionMetadata = {
      sessionId,
      startedAt: new Date().toISOString(),
      executionMode: mode,
      interactive: mode === ExecutionMode.INTERACTIVE,
      preview: context.preview,
      dryRun: context.dryRun,
      safeOnly: context.safeOnly,
      gitBranch: git.branch,
      gitCommit: git.commit,
      gitDirty: git.isDirty,
      modifiedFiles: [],
      fileHashes,
      closedFindings: [],
      reopenedFindings: [],
      approvedViolations: approvedViolations || [],
      status: 'CREATED',
    };

    this.store.save(session);
    this.activeSession = session;
    return session;
  }

  /**
   * Resumes an existing active or interrupted session.
   */
  public resumeSession(session: SessionMetadata): void {
    session.status = 'RUNNING';
    this.store.save(session);
    this.activeSession = session;
  }

  /**
   * Completes the active session, logging execution summaries and writing final state.
   */
  public completeSession(
    stats: { applied: number; modifiedFiles: string[] },
    verResult?: { findingsClosed: string[]; findingsReopened: string[] }
  ): void {
    if (!this.activeSession) return;

    this.activeSession.finishedAt = new Date().toISOString();
    this.activeSession.status = 'COMPLETED';

    // Save rollback ID if created
    if (stats.modifiedFiles.length > 0 && !this.activeSession.preview && !this.activeSession.dryRun) {
      // The Rollback ID aligns with the session epoch suffix
      const epoch = this.activeSession.sessionId.split('-')[1];
      this.activeSession.rollbackId = `rollback-${epoch}`;
    }

    if (verResult) {
      this.activeSession.closedFindings = verResult.findingsClosed;
      this.activeSession.reopenedFindings = verResult.findingsReopened;
    }

    this.store.save(this.activeSession);
    this.activeSession = null;
  }

  /**
   * Gracefully cancels the active session.
   */
  public cancelSession(): void {
    if (!this.activeSession) return;

    this.activeSession.finishedAt = new Date().toISOString();
    this.activeSession.status = 'CANCELLED';
    this.store.save(this.activeSession);
    this.activeSession = null;
  }

  /**
   * Interrupts the active session (e.g. from SIGINT).
   */
  public interruptSession(): void {
    if (!this.activeSession) return;

    this.activeSession.finishedAt = new Date().toISOString();
    this.activeSession.status = 'INTERRUPTED';
    this.store.save(this.activeSession);
    this.activeSession = null;
  }

  // ---------------------------------------------------------------------------
  // AutoFixObserver Implementation
  // ---------------------------------------------------------------------------

  public onFixStarted(): void {
    if (this.activeSession && this.activeSession.status === 'CREATED') {
      this.activeSession.status = 'RUNNING';
      this.store.save(this.activeSession);
    }
  }

  public onFixApplied(
    violation: StatelessViolation,
    _fixer: Fixer,
    result: FixResultItem
  ): void {
    if (!this.activeSession) return;

    // Add to modifiedFiles only if it was successfully written
    if (result.success && result.applied && !this.activeSession.modifiedFiles.includes(violation.path)) {
      this.activeSession.modifiedFiles.push(violation.path);
      // Atomic JSON write ensures interruption during loop doesn't corrupt metadata
      this.store.save(this.activeSession);
    }
  }

  public onFixSkipped(): void {
    // Progress is monitored but no files changed, no action needed on skip
  }

  public onExecutionFinished(): void {
    // Finalization is handled explicitly via completeSession
  }
}

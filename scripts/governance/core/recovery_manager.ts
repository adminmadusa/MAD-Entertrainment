// scripts/governance/core/recovery_manager.ts
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import type { GitMetadata } from './git_metadata_provider';
import { RollbackHistory } from './rollback_history';
import { SessionMetadata, SessionStore } from './session_store';

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

/**
 * Orchestrates safety checks and verifies the resumability of interrupted sessions.
 */
export class RecoveryManager {
  private readonly store: SessionStore;

  constructor(private readonly workspaceRoot: string) {
    this.store = new SessionStore(workspaceRoot);
  }

  /**
   * Detects if there is any active session in an interrupted/crashed state.
   */
  public detectInterruptedSession(): SessionMetadata | undefined {
    const active = this.store.loadActive();
    if (active && (active.status === 'RUNNING' || active.status === 'INTERRUPTED' || active.status === 'CREATED')) {
      return active;
    }
    return undefined;
  }

  /**
   * Evaluates if a session can be safely resumed by verifying file integrity,
   * rollback presence, and workspace existence.
   */
  public verifyResumeAllowed(session: SessionMetadata): { allowed: boolean; reason?: string } {
    // 1. If not dry-run or preview, session must have a rollbackId and the rollback backup must exist
    if (!session.preview && !session.dryRun) {
      if (!session.rollbackId) {
        return { allowed: false, reason: 'Session contains no rollback identifier' };
      }
      const backup = RollbackHistory.find(this.workspaceRoot, session.rollbackId);
      if (!backup) {
        return { allowed: false, reason: `Rollback backup file not found for ID: ${session.rollbackId}` };
      }

      // 2. Check each file in the session plan
      for (const [filePath, expectedPreHash] of Object.entries(session.fileHashes)) {
        const fullPath = resolve(this.workspaceRoot, filePath);

        // Files must still exist in the workspace
        if (!existsSync(fullPath)) {
          return { allowed: false, reason: `Expected target file no longer exists: ${filePath}` };
        }

        const wasModified = session.modifiedFiles.includes(filePath);

        if (wasModified) {
          // If already modified by the session, the backup file must contain the pre-session original content matching expectedPreHash
          const originalContentInBackup = backup.files[filePath];
          if (originalContentInBackup === undefined) {
            return { allowed: false, reason: `Original content for modified file missing in backup: ${filePath}` };
          }
          const backupHash = computeHash(originalContentInBackup);
          if (backupHash !== expectedPreHash) {
            return { allowed: false, reason: `Backup file content hash mismatch for modified file: ${filePath}` };
          }
        } else {
          // If not yet modified by the session, current file on disk must be unmodified
          const currentHash = getFileHash(fullPath);
          if (currentHash !== expectedPreHash) {
            return {
              allowed: false,
              reason: `Unmodified file was changed externally since session started: ${filePath}`,
            };
          }
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Compares the current git environment with the session's recorded git environment.
   */
  public verifyRepositoryState(
    session: SessionMetadata,
    currentGit: GitMetadata
  ): { matches: boolean; reason?: string } {
    if (session.gitBranch !== currentGit.branch) {
      return {
        matches: false,
        reason: `Current Git branch (${currentGit.branch}) differs from session's branch (${session.gitBranch})`,
      };
    }
    if (session.gitCommit !== currentGit.commit) {
      return {
        matches: false,
        reason: `Current Git HEAD commit (${currentGit.commit}) differs from session's commit (${session.gitCommit})`,
      };
    }
    if (session.gitDirty !== currentGit.isDirty) {
      return {
        matches: false,
        reason: `Current Git working tree dirty status (${currentGit.isDirty}) differs from session's status (${session.gitDirty})`,
      };
    }
    return { matches: true };
  }
}

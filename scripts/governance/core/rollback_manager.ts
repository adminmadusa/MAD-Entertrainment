// scripts/governance/core/rollback_manager.ts
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

import { FileWriter } from './file_writer';
import { readJsonIfExists, writeJsonIfChanged } from './json_utils';
import { RollbackHistory } from './rollback_history';

export interface RollbackBackup {
  id: string;
  timestamp: string;
  files: Record<string, string>; // relativePath -> content
  restored?: boolean;
  restoredAt?: string;
}

export class RollbackSession {
  private files: Record<string, string> = {};

  constructor(
    private readonly sessionDir: string,
    private readonly workspaceRoot: string
  ) {}

  public recordFile(relativePath: string, originalContent: string) {
    if (!(relativePath in this.files)) {
      this.files[relativePath] = originalContent;
    }
  }

  public getRecordedFiles(): Record<string, string> {
    return this.files;
  }

  public save(): string | undefined {
    const fileCount = Object.keys(this.files).length;
    if (fileCount === 0) return undefined;

    const timestamp = new Date().toISOString();
    const id = `rollback-${Date.now()}`;
    const filename = `${Date.now()}-rollback.json`;
    const filePath = join(this.sessionDir, filename);

    const backup: RollbackBackup = { id, timestamp, files: this.files };
    writeJsonIfChanged(filePath, backup);
    return filePath;
  }
}

export class RollbackManager {
  private static backupsDir(workspaceRoot: string): string {
    return resolve(workspaceRoot, '.governance/autofix/backups');
  }

  public static createSession(workspaceRoot: string): RollbackSession {
    const dir = this.backupsDir(workspaceRoot);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return new RollbackSession(dir, workspaceRoot);
  }

  /**
   * Executes rollback on the latest active (unrestored) backup.
   * Marks the backup as restored instead of deleting it.
   */
  public static rollbackLatest(workspaceRoot: string): { success: boolean; filesRestored: string[] } {
    const latestActive = RollbackHistory.findLatestActive(workspaceRoot);
    if (!latestActive) {
      return { success: false, filesRestored: [] };
    }

    return this.applyRollback(workspaceRoot, latestActive);
  }

  /**
   * Executes rollback on a specific backup by ID.
   * Marks the backup as restored.
   */
  public static rollbackSession(workspaceRoot: string, sessionId: string): { success: boolean; filesRestored: string[] } {
    const backup = RollbackHistory.find(workspaceRoot, sessionId);
    if (!backup || backup.restored) {
      return { success: false, filesRestored: [] };
    }

    return this.applyRollback(workspaceRoot, backup);
  }

  private static applyRollback(workspaceRoot: string, backup: RollbackBackup): { success: boolean; filesRestored: string[] } {
    const filesRestored: string[] = [];

    // Restore files using centralized FileWriter
    for (const [relPath, content] of Object.entries(backup.files)) {
      FileWriter.write(workspaceRoot, relPath, content);
      filesRestored.push(relPath);
    }

    // Mark as restored and save back to the same file on disk
    backup.restored = true;
    backup.restoredAt = new Date().toISOString();

    const dir = this.backupsDir(workspaceRoot);
    // Find the file containing this backup
    const files = readdirSync(dir).filter(f => f.endsWith('-rollback.json'));
    for (const file of files) {
      const filePath = join(dir, file);
      const data = readJsonIfExists<RollbackBackup>(filePath);
      if (data && data.id === backup.id) {
        writeJsonIfChanged(filePath, backup);
        break;
      }
    }

    return { success: true, filesRestored };
  }
}

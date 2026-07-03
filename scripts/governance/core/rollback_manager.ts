import { existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { readJsonIfExists, writeJsonIfChanged } from './json_utils';
import { FileWriter } from './file_writer';

export interface RollbackBackup {
  id: string;
  timestamp: string;
  files: Record<string, string>; // relativePath -> content
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

  public static rollbackLatest(workspaceRoot: string): { success: boolean; filesRestored: string[] } {
    const dir = this.backupsDir(workspaceRoot);
    if (!existsSync(dir)) {
      return { success: false, filesRestored: [] };
    }

    const files = readdirSync(dir)
      .filter(f => f.endsWith('-rollback.json'))
      .sort(); // Lexicographical sort matches chronological sort due to epoch timestamp prefix

    if (files.length === 0) {
      return { success: false, filesRestored: [] };
    }

    const latestFile = files[files.length - 1];
    const latestPath = join(dir, latestFile);
    const backup = readJsonIfExists<RollbackBackup>(latestPath);

    if (!backup) {
      return { success: false, filesRestored: [] };
    }

    const filesRestored: string[] = [];
    
    // Restore files using centralized FileWriter to enforce validation checks
    for (const [relPath, content] of Object.entries(backup.files)) {
      FileWriter.write(workspaceRoot, relPath, content);
      filesRestored.push(relPath);
    }

    // Clean up backup file
    unlinkSync(latestPath);

    return { success: true, filesRestored };
  }
}

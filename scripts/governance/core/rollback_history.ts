// scripts/governance/core/rollback_history.ts
import { existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

import { readJsonIfExists } from './json_utils';
import type { RollbackBackup } from './rollback_manager';

export class RollbackHistory {
  private static backupsDir(workspaceRoot: string): string {
    return resolve(workspaceRoot, '.governance/autofix/backups');
  }

  /**
   * Lists all rollback backups, newest first.
   */
  public static list(workspaceRoot: string): RollbackBackup[] {
    const dir = this.backupsDir(workspaceRoot);
    if (!existsSync(dir)) return [];

    return readdirSync(dir)
      .filter(f => f.endsWith('-rollback.json'))
      .map(f => readJsonIfExists<RollbackBackup>(join(dir, f)))
      .filter((b): b is RollbackBackup => !!b)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Finds a specific rollback backup by session/rollback ID.
   */
  public static find(workspaceRoot: string, id: string): RollbackBackup | undefined {
    const dir = this.backupsDir(workspaceRoot);
    if (!existsSync(dir)) return undefined;

    // The backup filename is either `<epoch>-rollback.json` or we scan files to match backup.id
    const files = readdirSync(dir).filter(f => f.endsWith('-rollback.json'));
    for (const file of files) {
      const backup = readJsonIfExists<RollbackBackup>(join(dir, file));
      if (backup && (backup.id === id || backup.id === `rollback-${id}`)) {
        return backup;
      }
    }
    return undefined;
  }

  /**
   * Finds the latest active (unrestored) rollback backup.
   */
  public static findLatestActive(workspaceRoot: string): RollbackBackup | undefined {
    return this.list(workspaceRoot).find(b => !b.restored);
  }
}

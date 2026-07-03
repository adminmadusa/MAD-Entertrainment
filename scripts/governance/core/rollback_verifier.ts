// scripts/governance/core/rollback_verifier.ts
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

import { RollbackHistory } from './rollback_history';

export interface RollbackVerificationResult {
  exists: boolean;
  restored: boolean;
  files: {
    path: string;
    exists: boolean;
    modifiedAfterFix: boolean;
  }[];
  safeToRollback: boolean;
}

export class RollbackVerifier {
  /**
   * Verifies if a rollback snapshot exists, whether it has been restored,
   * and if the files it targets are safe to restore (not modified after fix).
   */
  public static verify(workspaceRoot: string, sessionId: string): RollbackVerificationResult {
    const backup = RollbackHistory.find(workspaceRoot, sessionId);

    if (!backup) {
      return {
        exists: false,
        restored: false,
        files: [],
        safeToRollback: false,
      };
    }

    if (backup.restored) {
      return {
        exists: true,
        restored: true,
        files: Object.keys(backup.files).map(f => ({
          path: f,
          exists: existsSync(resolve(workspaceRoot, f)),
          modifiedAfterFix: false,
        })),
        safeToRollback: false,
      };
    }

    const files = [];
    let safeToRollback = true;
    const backupTime = new Date(backup.timestamp).getTime();

    for (const filePath of Object.keys(backup.files)) {
      const fullPath = resolve(workspaceRoot, filePath);
      const exists = existsSync(fullPath);

      let modifiedAfterFix = false;
      if (exists) {
        try {
          const stats = statSync(fullPath);
          // Allow 5-second leeway for the write operations during execution
          if (stats.mtimeMs > backupTime + 5000) {
            modifiedAfterFix = true;
            safeToRollback = false;
          }
        } catch {
          // Fallback to safe if stat fails
        }
      } else {
        safeToRollback = false;
      }

      files.push({
        path: filePath,
        exists,
        modifiedAfterFix,
      });
    }

    return {
      exists: true,
      restored: false,
      files,
      safeToRollback,
    };
  }
}

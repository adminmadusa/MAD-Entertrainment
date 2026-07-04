import { RollbackResult } from '../base/result';
import { writeFileSync, existsSync } from 'fs';

export class RollbackManager {
  private history = new Map<string, { file: string; content: string }>();

  backup(patchId: string, file: string, content: string) {
    this.history.set(patchId, { file, content });
  }

  async rollback(patchId: string): Promise<RollbackResult> {
    const entry = this.history.get(patchId);
    if (!entry) {
      return { success: false, originalContent: '', error: `No backup found for patch: ${patchId}` };
    }

    try {
      writeFileSync(entry.file, entry.content, 'utf8');
      this.history.delete(patchId);
      return { success: true, originalContent: entry.content };
    } catch (err: any) {
      return { success: false, originalContent: '', error: `Rollback failed: ${err.message}` };
    }
  }
}
export const rollbackManager = new RollbackManager();

// scripts/governance/core/rename_detector.ts
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

export class RenameDetector {
  private static workspaceRoot = resolve(__dirname, '../../..');

  private static cache = new Map<string, string[]>();

  /**
   * Evaluates the git history of a file to check if it was renamed from a previous path.
   * Returns the array of previous names of the file relative to the workspace root.
   */
  public static getPreviousPaths(currentPath: string): string[] {
    if (this.cache.has(currentPath)) {
      return this.cache.get(currentPath)!;
    }

    try {
      const fullPath = resolve(this.workspaceRoot, currentPath);
      if (!existsSync(fullPath)) {
        return [];
      }

      // Execute git log to follow name changes
      const output = execSync(
        `git log --follow --name-only --format="" -- "${fullPath}"`,
        { cwd: this.workspaceRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const paths = output
        .split('\n')
        .map(p => p.trim())
        .filter(p => p !== '' && p !== currentPath);

      // Return unique previous relative paths
      const result = Array.from(new Set(paths));
      this.cache.set(currentPath, result);
      return result;
    } catch (err) {
      // In case git is not initialized or fails, fallback to empty array
      return [];
    }
  }

  /**
   * Checks if any previous path of a newly scanned file matches the path in a persistent finding.
   */
  public static wasRenamedFrom(currentPath: string, oldPath: string): boolean {
    const previousPaths = this.getPreviousPaths(currentPath);
    return previousPaths.includes(oldPath);
  }
}
export const engineVersion = '1.0.0';

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { PackageManagerAdapter } from './PackageManagerAdapter';

export class PnpmAdapter implements PackageManagerAdapter {
  async getWorkspaceVersion(rootPath: string): Promise<string> {
    const pkgPath = join(rootPath, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return pkg.version ?? '0.1.0';
    } catch {
      return '0.1.0';
    }
  }

  async setWorkspaceVersion(rootPath: string, version: string, packages: string[], dryRun: boolean): Promise<string[]> {
    const bumped: string[] = [];

    for (const t of packages) {
      try {
        const pkg = JSON.parse(readFileSync(t, 'utf8'));
        if (!dryRun) {
          pkg.version = version;
          writeFileSync(t, JSON.stringify(pkg, null, 2) + '\n');
        }
        bumped.push(t.replace(rootPath + '/', ''));
      } catch {
        // File does not exist or unreadable, skip
      }
    }
    return bumped;
  }
}

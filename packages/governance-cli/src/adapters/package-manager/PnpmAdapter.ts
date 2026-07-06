import { PackageManagerAdapter } from './PackageManagerAdapter';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export class PnpmAdapter implements PackageManagerAdapter {
  async getWorkspaceVersion(rootPath: string): Promise<string> {
    const pkgPath = join(rootPath, 'package.json');
    if (!existsSync(pkgPath)) {
      return '0.1.0';
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '0.1.0';
  }

  async setWorkspaceVersion(rootPath: string, version: string, dryRun: boolean): Promise<string[]> {
    const bumped: string[] = [];
    const targets = [
      join(rootPath, 'package.json'),
      join(rootPath, 'packages/governance-cli/package.json')
    ];

    for (const t of targets) {
      if (existsSync(t)) {
        if (!dryRun) {
          const pkg = JSON.parse(readFileSync(t, 'utf8'));
          pkg.version = version;
          writeFileSync(t, JSON.stringify(pkg, null, 2) + '\n');
        }
        bumped.push(t);
      }
    }
    return bumped;
  }
}

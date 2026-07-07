import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

import { PackageManagerAdapter } from '../package-manager/PackageManagerAdapter';
import { PnpmAdapter } from '../package-manager/PnpmAdapter';
import { RepositoryAdapter } from './RepositoryAdapter';

export class PnpmRepositoryAdapter implements RepositoryAdapter {
  constructor(private rootPath: string) {}

  async getRoot(): Promise<string> {
    return this.rootPath;
  }

  async getPackageManager(): Promise<PackageManagerAdapter> {
    return new PnpmAdapter();
  }

  async getWorkspaceName(): Promise<string> {
    return 'mad-entertrainment';
  }

  async getWorkspacePackages(): Promise<string[]> {
    const packages: string[] = [];
    const rootPkg = join(this.rootPath, 'package.json');
    if (existsSync(rootPkg)) {
      packages.push(rootPkg);
    }

    const scanDirs = ['packages', 'apps'];
    for (const dir of scanDirs) {
      const dirPath = join(this.rootPath, dir);
      if (existsSync(dirPath)) {
        try {
          const list = readdirSync(dirPath);
          for (const item of list) {
            const pkgJson = join(dirPath, item, 'package.json');
            if (existsSync(pkgJson)) {
              packages.push(pkgJson);
            }
          }
        } catch {}
      }
    }
    return packages;
  }
}

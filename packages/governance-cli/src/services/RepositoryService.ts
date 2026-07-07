import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface RepositoryService {
  getRoot(): Promise<string>;
  getWorkspaceType(): Promise<'pnpm' | 'npm' | 'yarn'>;
  getDefaultBranch(): Promise<string>;
  getPackageManager(): Promise<string>;
  hasWorkspace(): Promise<boolean>;
}

export class LocalRepositoryService implements RepositoryService {
  constructor(private rootPath: string) {}

  async getRoot(): Promise<string> {
    return this.rootPath;
  }

  async getWorkspaceType(): Promise<'pnpm' | 'npm' | 'yarn'> {
    if (existsSync(join(this.rootPath, 'pnpm-workspace.yaml'))) {
      return 'pnpm';
    }
    if (existsSync(join(this.rootPath, 'lerna.json')) || existsSync(join(this.rootPath, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  async getDefaultBranch(): Promise<string> {
    // Check local configurations or default to main/develop
    return 'develop';
  }

  async getPackageManager(): Promise<string> {
    const pkgPath = join(this.rootPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.packageManager) {
          return pkg.packageManager;
        }
      } catch {
        // Fallback
      }
    }
    const type = await this.getWorkspaceType();
    return type === 'pnpm' ? 'pnpm' : (type === 'yarn' ? 'yarn' : 'npm');
  }

  async hasWorkspace(): Promise<boolean> {
    const type = await this.getWorkspaceType();
    return type !== 'npm';
  }
}

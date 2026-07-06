import { RepositoryAdapter } from './RepositoryAdapter';
import { PackageManagerAdapter } from '../package-manager/PackageManagerAdapter';
import { PnpmAdapter } from '../package-manager/PnpmAdapter';

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
}

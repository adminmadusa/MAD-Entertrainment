import { RepositoryAdapter } from '../../adapters/repository/RepositoryAdapter';

export class VersionService {
  constructor(private repoAdapter: RepositoryAdapter) {}

  async getCurrentVersion(): Promise<string> {
    const root = await this.repoAdapter.getRoot();
    const pkgAdapter = await this.repoAdapter.getPackageManager();
    return pkgAdapter.getWorkspaceVersion(root);
  }

  validate(version: string): boolean {
    // Basic SemVer regex validation: e.g. "1.5.0", "1.5.0-alpha.1"
    const regex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    return regex.test(version);
  }

  async bump(version: string, dryRun: boolean): Promise<string[]> {
    const root = await this.repoAdapter.getRoot();
    const pkgAdapter = await this.repoAdapter.getPackageManager();
    return pkgAdapter.setWorkspaceVersion(root, version, dryRun);
  }
}

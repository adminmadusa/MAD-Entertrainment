import { RepositoryAdapter } from '../../adapters/repository/RepositoryAdapter';

export class VersionService {
  constructor(private repoAdapter: RepositoryAdapter) {}

  async getCurrentVersion(): Promise<string> {
    const root = await this.repoAdapter.getRoot();
    const pkgAdapter = await this.repoAdapter.getPackageManager();
    return pkgAdapter.getWorkspaceVersion(root);
  }

  validate(version: string): boolean {
    // Official SemVer 2.0.0 validation regex (matches prerelease and build metadata)
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return regex.test(version);
  }

  async bump(version: string, dryRun: boolean): Promise<string[]> {
    const root = await this.repoAdapter.getRoot();
    const pkgAdapter = await this.repoAdapter.getPackageManager();
    const packages = await this.repoAdapter.getWorkspacePackages();
    return pkgAdapter.setWorkspaceVersion(root, version, packages, dryRun);
  }

  async getWorkspacePackages(): Promise<string[]> {
    const root = await this.repoAdapter.getRoot();
    const packages = await this.repoAdapter.getWorkspacePackages();
    return packages.map(p => p.replace(root + '/', ''));
  }
}

import { PackageManagerAdapter } from '../package-manager/PackageManagerAdapter';

export interface RepositoryAdapter {
  getRoot(): Promise<string>;
  getPackageManager(): Promise<PackageManagerAdapter>;
  getWorkspaceName(): Promise<string>;
  getWorkspacePackages(): Promise<string[]>;
}

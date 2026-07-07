export interface PackageManagerAdapter {
  getWorkspaceVersion(rootPath: string): Promise<string>;
  setWorkspaceVersion(rootPath: string, version: string, packages: string[], dryRun: boolean): Promise<string[]>;
}

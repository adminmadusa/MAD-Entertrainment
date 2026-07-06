export interface StatusResult {
  branch: string;
  isClean: boolean;
  defaultBranch: string;
  nodeVersion: string;
  pnpmVersion: string;
  patternsCount: number;
  backlogCount: number;
  repoRoot: string;
  governanceCliVersion: string;
}

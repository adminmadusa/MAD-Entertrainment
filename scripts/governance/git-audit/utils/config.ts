export interface GovernanceConfig {
  stale_days: number;
  max_branch_age: number;
  max_dangling_commits: number;
}

export const defaultConfig: GovernanceConfig = {
  stale_days: 90,
  max_branch_age: 180,
  max_dangling_commits: 500
};

export interface GovernanceConfig {
  stale_days: number;
  max_branch_age: number;
  max_dangling_commits: number;
  stale_commit_threshold: number;
  trendHistoryLimit: number;
}

export const defaultConfig: GovernanceConfig = {
  stale_days: 90,
  max_branch_age: 180,
  max_dangling_commits: 500,
  stale_commit_threshold: 30,
  trendHistoryLimit: 50,
};

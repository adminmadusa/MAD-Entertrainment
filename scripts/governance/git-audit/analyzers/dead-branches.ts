import { BranchInfo } from '../models/branch';
import { GovernanceConfig } from '../utils/config';

export interface StaleReport {
  isStale: boolean;
  isAbandoned: boolean;
  lagCommits: number;
  daysSinceLastCommit: number;
}

export function analyzeStaleStatus(branch: BranchInfo, config: GovernanceConfig): StaleReport {
  const lagCommits = branch.behind;

  // Calculate days since last commit
  const commitTimestampMs = branch.commitTime * 1000;
  const nowMs = Date.now();
  const timeDiffMs = nowMs - commitTimestampMs;
  const daysSinceLastCommit = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60 * 24)));

  const isStale = daysSinceLastCommit > config.stale_days || lagCommits > config.stale_commit_threshold;
  const isAbandoned = daysSinceLastCommit > config.max_branch_age;

  return {
    isStale,
    isAbandoned,
    lagCommits,
    daysSinceLastCommit
  };
}

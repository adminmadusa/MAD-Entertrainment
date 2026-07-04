import { BranchInfo } from '../models/branch';

export interface StaleReport {
  isStale: boolean;
  isAbandoned: boolean;
  lagCommits: number;
  daysSinceLastCommit: number;
}

export function analyzeStaleStatus(branch: BranchInfo): StaleReport {
  const lagCommits = branch.behind;
  
  // Calculate days since last commit
  const commitTimestampMs = branch.commitTime * 1000;
  const nowMs = Date.now();
  const timeDiffMs = nowMs - commitTimestampMs;
  const daysSinceLastCommit = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60 * 24)));

  const isStale = lagCommits > 30;
  
  // Abandoned: No activity for > 14 days and unmerged
  const isAbandoned = daysSinceLastCommit > 14 && lagCommits > 0;

  return {
    isStale,
    isAbandoned,
    lagCommits,
    daysSinceLastCommit
  };
}

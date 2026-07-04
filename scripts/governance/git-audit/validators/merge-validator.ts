import { BranchInfo } from '../models/branch';

export interface MergeCheckReport {
  requiresMerge: boolean;
  unmergedCommitsCount: number;
  reason: string | null;
}

export function checkRequiresMerge(
  branch: BranchInfo,
  isMerged: boolean,
  isSquashMerged: boolean
): MergeCheckReport {
  const name = branch.name;
  if (name === 'develop' || name === 'live' || name === 'main' || name.startsWith('origin/')) {
    return { requiresMerge: false, unmergedCommitsCount: 0, reason: null };
  }

  // If it's already merged or squash merged, it does not require a merge
  if (isMerged || isSquashMerged) {
    return { requiresMerge: false, unmergedCommitsCount: 0, reason: null };
  }

  const unmergedCommitsCount = branch.uniqueCommits.length;
  const requiresMerge = unmergedCommitsCount > 0;

  return {
    requiresMerge,
    unmergedCommitsCount,
    reason: requiresMerge ? `${unmergedCommitsCount} unique commits are not integrated into develop.` : null
  };
}

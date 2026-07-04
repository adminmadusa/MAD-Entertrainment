import { hasGitTags } from '../utils/git';

export function collectTagsForBranch(branchName: string): boolean {
  return hasGitTags(branchName);
}

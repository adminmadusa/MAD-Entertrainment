import { BranchInfo } from '../models/branch';
import { VerificationInfo } from '../models/registry';
import { LifecycleState } from '../models/action';
import { isProtectedBranch } from '../validators/protection-validator';

export function determineLifecycleState(
  branch: BranchInfo,
  v: VerificationInfo,
  isDuplicate: boolean,
  isStale: boolean
): LifecycleState {
  const name = branch.name;

  // 1. Protected
  if (isProtectedBranch(name)) {
    return 'Protected';
  }

  // 2. Archived / Legacy
  if (name === 'main' || name === 'origin/main') {
    return 'Archived';
  }

  // 3. Integration
  if (name === 'test/remediation-integration') {
    return 'Integration';
  }

  // 4. Ready For Delete (Local or remote that passes all deletion safety checks)
  const isMergedOrPatchEquiv = v.isMerged || v.isSquashMerged;
  const hasNoBlocks =
    !v.isProtected &&
    !v.hasActiveWorktree &&
    v.hasOpenPR !== 'YES' &&
    !v.isAnotherBranchBasedOnIt &&
    !v.isPartOfActiveStack &&
    !v.hasReleaseDependency &&
    !v.hasTags &&
    !v.hasActiveDeployment;

  if (isMergedOrPatchEquiv && hasNoBlocks) {
    return 'Ready For Delete';
  }

  // 5. Blocked
  if (isMergedOrPatchEquiv && !hasNoBlocks) {
    return 'Blocked';
  }

  // 6. Duplicate Candidate
  if (isDuplicate) {
    return 'Duplicate Candidate';
  }

  // 7. Experimental (AI OS phase branches)
  if (name.startsWith('feat/ai-os-phase-')) {
    return 'Experimental';
  }

  // 8. Open PR
  if (v.hasOpenPR === 'YES') {
    return 'Open PR';
  }

  // 9. Stale
  if (isStale) {
    return 'Stale';
  }

  // 10. Patch Equivalent (if it is squash merged but somehow not caught above, or fallback)
  if (v.isSquashMerged) {
    return 'Patch Equivalent';
  }

  // 11. Active Development (default for unmerged branches with active commits)
  return 'Active Development';
}

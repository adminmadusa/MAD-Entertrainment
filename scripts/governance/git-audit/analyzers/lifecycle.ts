import { BranchInfo } from '../models/branch';
import { VerificationInfo } from '../models/registry';
import { LifecycleState } from '../models/action';
import { isProtectedBranch } from '../validators/protection-validator';

export function determineLifecycleState(
  branch: BranchInfo,
  v: VerificationInfo,
  isDuplicate: boolean
): LifecycleState {
  const name = branch.name;

  // 1. PROTECTED
  if (isProtectedBranch(name)) {
    return 'PROTECTED';
  }

  // 2. LEGACY
  if (name === 'main' || name === 'origin/main') {
    return 'LEGACY';
  }

  // 3. INTEGRATION
  if (name === 'test/remediation-integration') {
    return 'INTEGRATION';
  }

  // 4. DUPLICATE
  if (isDuplicate) {
    return 'DUPLICATE';
  }

  // 5. STACK_PARENT / STACK_CHILD (for AI OS stack)
  if (name.startsWith('feat/ai-os-phase-')) {
    if (v.isAnotherBranchBasedOnIt) {
      return 'STACK_PARENT';
    }
    return 'STACK_CHILD';
  }

  // 6. READY_FOR_DELETION (local branch meeting all safety checks)
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

  if (branch.isLocal && isMergedOrPatchEquiv && hasNoBlocks) {
    return 'READY_FOR_DELETION';
  }

  // 7. BLOCKED
  if (branch.isLocal && isMergedOrPatchEquiv && !hasNoBlocks) {
    return 'BLOCKED';
  }

  // 8. OPEN_PR
  if (v.hasOpenPR === 'YES') {
    return 'OPEN_PR';
  }

  // 9. PATCH_EQUIVALENT / MERGED (for remote branches or non-deletable local states)
  if (v.isSquashMerged) {
    return 'PATCH_EQUIVALENT';
  }
  if (v.isMerged) {
    return 'MERGED';
  }

  // 10. ACTIVE (unmerged active branch)
  if (branch.ahead > 0) {
    return 'ACTIVE';
  }

  return 'UNKNOWN';
}

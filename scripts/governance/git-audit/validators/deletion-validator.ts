import { VerificationInfo } from '../models/registry';

export interface DeletionPolicyReport {
  isReadyForDeletion: boolean;
  lifecycleState: 'Ready For Delete' | 'Blocked';
  blockedReasons: string[];
  confidence: string;
}

export function validateDeletionPolicy(v: VerificationInfo, isLocal: boolean): DeletionPolicyReport {
  const blockedReasons: string[] = [];

  // Gate 1: Protected branch
  if (v.isProtected) {
    blockedReasons.push('Branch is a protected primary branch (develop/live).');
  }

  // Gate 2: Current HEAD / Active worktree
  if (v.hasActiveWorktree) {
    blockedReasons.push('Branch is the currently checked out HEAD or active in another worktree.');
  }

  // Gate 3: Open PR
  if (v.hasOpenPR === 'YES') {
    blockedReasons.push(`Branch has an open pull request (#${v.prNumber}).`);
  }

  // Gate 4: Ancestry containment & patch-equivalence
  // Must be fully merged OR patch-equivalent
  if (!v.isMerged && !v.isSquashMerged) {
    blockedReasons.push('Branch contains unique commits not integrated into develop (fails cherry and merge-base checks).');
  }

  // Gate 5: Downstream dependencies (used by another branch)
  if (v.isAnotherBranchBasedOnIt) {
    blockedReasons.push('Another active development branch is based on this branch tip (downstream dependency).');
  }

  // Gate 6: Stack dependency (AI OS intermediate phase branches)
  if (v.isPartOfActiveStack) {
    blockedReasons.push('Branch is a stack parent in an active sequence (stack tip is unmerged or not backed up).');
  }

  // Gate 7: Tags point to or contain this branch
  if (v.hasTags) {
    blockedReasons.push('Git tags point to or contain this branch reference.');
  }

  // Gate 8: Active deployment mapping
  if (v.hasActiveDeployment) {
    blockedReasons.push('Branch is mapped to an active server/web deployment.');
  }

  // Gate 9: Release dependency
  if (v.hasReleaseDependency) {
    blockedReasons.push('Branch is designated as an active release tracking branch.');
  }

  const isReadyForDeletion = isLocal && blockedReasons.length === 0;
  const lifecycleState = isReadyForDeletion ? 'Ready For Delete' : 'Blocked';
  const confidence = isReadyForDeletion ? '99%' : '0%';

  return {
    isReadyForDeletion,
    lifecycleState,
    blockedReasons,
    confidence
  };
}

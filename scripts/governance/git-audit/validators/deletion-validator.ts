import { VerificationInfo } from '../models/registry';

export interface DeletionPolicyReport {
  isReadyForDeletion: boolean;
  lifecycleState: 'READY_FOR_DELETION' | 'BLOCKED';
  blockedReasons: string[];
}

export function validateDeletionPolicy(v: VerificationInfo, isLocal: boolean): DeletionPolicyReport {
  const blockedReasons: string[] = [];

  if (v.isProtected) {
    blockedReasons.push('Protected repository branch.');
  }
  
  if (v.hasActiveWorktree) {
    blockedReasons.push('Branch is checked out in an active Git worktree.');
  }

  if (v.hasOpenPR === 'YES') {
    blockedReasons.push(`Branch has an open pull request (#${v.prNumber}).`);
  }

  // Deletion policy: must be merged or patch-equivalent
  if (!v.isMerged && !v.isSquashMerged) {
    blockedReasons.push('Branch has unintegrated unique commits (neither merged nor patch-equivalent).');
  }

  if (v.isAnotherBranchBasedOnIt) {
    blockedReasons.push('Another active branch is based on this branch (downstream dependency).');
  }

  if (v.isPartOfActiveStack) {
    blockedReasons.push('Branch is part of an active stack (intermediate stack parent).');
  }

  if (v.hasReleaseDependency) {
    blockedReasons.push('Branch has release dependency.');
  }

  if (v.hasTags) {
    blockedReasons.push('Branch points to active tags.');
  }

  if (v.hasActiveDeployment) {
    blockedReasons.push('Branch is associated with an active deployment mapping.');
  }

  const isReadyForDeletion = isLocal && blockedReasons.length === 0;
  const lifecycleState = isReadyForDeletion ? 'READY_FOR_DELETION' : 'BLOCKED';

  return {
    isReadyForDeletion,
    lifecycleState,
    blockedReasons
  };
}

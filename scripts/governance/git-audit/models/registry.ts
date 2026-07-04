import { BranchInfo } from './branch';

export interface VerificationInfo {
  branchName: string;
  hasUniqueCommits: boolean;
  isMerged: boolean;
  isSquashMerged: boolean;
  hasOpenPR: 'YES' | 'NO' | 'UNKNOWN';
  prNumber: string | null;
  hasActiveWorktree: boolean;
  isProtected: boolean;
  isAnotherBranchBasedOnIt: boolean;
  isPartOfActiveStack: boolean;
  usedByBranches: string[];
  upstream: string | null;
  hasReleaseDependency: boolean;
  hasTags: boolean;
  hasActiveDeployment: boolean;
  remediationIntegrated: boolean;
  verificationStatus: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  evidence: {
    commands: Record<string, string>;
    outputs: Record<string, string>;
  };
}

export interface RegisteredBranch extends BranchInfo {
  lifecycleState: string;
  verification: VerificationInfo;
}

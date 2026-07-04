/**
 * GitSnapshotData — typed shape of DomainSnapshot.data for the Git provider.
 *
 * Rules cast snapshot.data to this type to access Git-specific state.
 * This is an internal git-provider type, not part of the frozen public contracts.
 */
import type { BranchInfo } from '../../git-audit/models/branch';
import type { VerificationInfo } from '../../git-audit/models/registry';

export interface GitSnapshotData {
  readonly branches: BranchInfo[];
  readonly verifications: Map<string, VerificationInfo>;
  readonly isWorkingTreeClean: boolean;
  readonly danglingCommitsCount: number;
  readonly worktreesCount: number;
}

/**
 * Cast DomainSnapshot.data to GitSnapshotData.
 * Throws if the required shape is missing (programming error — not a user error).
 */
export function asGitSnapshot(data: Record<string, unknown>): GitSnapshotData {
  if (!Array.isArray(data['branches'])) {
    throw new Error('Invalid GitSnapshotData: missing branches array');
  }
  if (!(data['verifications'] instanceof Map)) {
    throw new Error('Invalid GitSnapshotData: missing verifications Map');
  }
  return data as unknown as GitSnapshotData;
}

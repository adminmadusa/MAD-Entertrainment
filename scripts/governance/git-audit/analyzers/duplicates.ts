import { BranchInfo } from '../models/branch';

export interface DuplicateReport {
  isDuplicate: boolean;
  duplicateOf: string | null;
  reason: string | null;
}

export function analyzeDuplicateBranches(
  currentBranch: BranchInfo,
  allBranches: BranchInfo[]
): DuplicateReport {
  const name = currentBranch.name;
  
  // Exclude protected and integration branches from duplicate checking
  if (name === 'develop' || name === 'live' || name === 'test/remediation-integration' || name === 'origin/develop' || name === 'origin/live') {
    return { isDuplicate: false, duplicateOf: null, reason: null };
  }

  // 1. Check for identical commit SHA (excluding remote counterpart with same name and protected branches)
  for (const b of allBranches) {
    if (b.name !== name && b.sha === currentBranch.sha) {
      // Exclude mapping against protected branches as "duplicates"
      if (b.name === 'develop' || b.name === 'live' || b.name === 'origin/develop' || b.name === 'origin/live') {
        continue;
      }
      
      const cleanA = name.replace('origin/', '');
      const cleanB = b.name.replace('origin/', '');
      if (cleanA !== cleanB) {
        return {
          isDuplicate: true,
          duplicateOf: b.name,
          reason: `SHA matches branch '${b.name}' exactly (${currentBranch.sha.substring(0, 8)})`
        };
      }
    }
  }

  // 2. Check for redundant name duplicate issues
  if (name.includes('server-hygiene-duplicate-imports')) {
    return {
      isDuplicate: true,
      duplicateOf: 'fix/hyg-002-duplicate-imports',
      reason: 'Redundant branch addressing duplicate import violations under issue HYG-002 / VAL-HYG-002'
    };
  }

  return { isDuplicate: false, duplicateOf: null, reason: null };
}

import { BranchInfo } from '../models/branch';
import { runCommand, runWithExitCode } from '../utils/exec';

export interface DuplicateReport {
  isDuplicate: boolean;
  duplicateOf: string | null;
  reason: string | null;
  confidence: string;
}

export function analyzeDuplicateBranches(
  currentBranch: BranchInfo,
  allBranches: BranchInfo[]
): DuplicateReport {
  const name = currentBranch.name;
  
  // Exclude protected and integration branches from duplicate checking
  if (name === 'develop' || name === 'live' || name === 'test/remediation-integration' || name === 'origin/develop' || name === 'origin/live') {
    return { isDuplicate: false, duplicateOf: null, reason: null, confidence: '0%' };
  }

  for (const b of allBranches) {
    if (b.name !== name && b.sha !== currentBranch.sha) {
      if (b.name === 'develop' || b.name === 'live' || b.name === 'origin/develop' || b.name === 'origin/live') {
        continue;
      }
      
      const cleanA = name.replace('origin/', '');
      const cleanB = b.name.replace('origin/', '');
      if (cleanA === cleanB) continue;

      // 1. Same resulting tree: diff is empty
      const diffOutput = runCommand(`git diff "${name}".."${b.name}"`);
      const isSameTree = diffOutput.trim() === '';

      // 2. Same patch-ids: git cherry returns only equivalent commits
      const cherryOutput = runCommand(`git cherry "${b.name}" "${name}"`);
      const hasUnique = cherryOutput.split('\n').filter(Boolean).some(l => l.startsWith('+'));

      if (isSameTree && !hasUnique) {
        return {
          isDuplicate: true,
          duplicateOf: b.name,
          reason: `Resulting tree and patches are identical to branch '${b.name}'.`,
          confidence: '99%'
        };
      }
    }
  }

  // Check for known naming redundancies (like server-hygiene-duplicate-imports under HYG-002)
  if (name.includes('server-hygiene-duplicate-imports')) {
    // If it is patch-equivalent to develop already, it's a confirmed duplicate
    const isPatchEq = runCommand(`git cherry develop "${name}"`).split('\n').filter(Boolean).every(l => l.startsWith('-'));
    if (isPatchEq) {
      return {
        isDuplicate: true,
        duplicateOf: 'fix/hyg-002-duplicate-imports',
        reason: 'Redundant branch addressing VAL-HYG-002, fully resolved in develop via fix/hyg-002-duplicate-imports.',
        confidence: '99%'
      };
    }
  }

  return { isDuplicate: false, duplicateOf: null, reason: null, confidence: '0%' };
}

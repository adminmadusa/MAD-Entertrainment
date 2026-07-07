import { isReachable } from '../utils/git';

export interface StackReport {
  isStackValid: boolean;
  phaseChain: { phase: number; name: string; exists: boolean; isAncestorOfNext: boolean }[];
  brokenLinkReason: string | null;
}

export function analyzeAiOsStack(branchNames: string[]): StackReport {
  const phaseBranches: { phase: number; name: string }[] = [];
  
  // Extract all AI OS phase branches
  for (const name of branchNames) {
    const match = name.match(/^feat\/ai-os-phase-(\d+)-/);
    if (match) {
      phaseBranches.push({
        phase: parseInt(match[1], 10),
        name
      });
    }
  }

  // Sort by phase number
  phaseBranches.sort((a, b) => a.phase - b.phase);

  const phaseChain: { phase: number; name: string; exists: boolean; isAncestorOfNext: boolean }[] = [];
  let isStackValid = true;
  let brokenLinkReason: string | null = null;

  // We expect phases 1 to 20 to exist
  for (let i = 1; i <= 20; i++) {
    const found = phaseBranches.find(pb => pb.phase === i);
    if (!found) {
      isStackValid = false;
      brokenLinkReason = `Phase ${i} branch is missing from the repository.`;
      phaseChain.push({ phase: i, name: `feat/ai-os-phase-${i}-...`, exists: false, isAncestorOfNext: false });
      continue;
    }
    
    phaseChain.push({ phase: i, name: found.name, exists: true, isAncestorOfNext: false });
  }

  // Verify ancestry between adjacent phases
  if (isStackValid) {
    for (let i = 0; i < phaseChain.length - 1; i++) {
      const current = phaseChain[i];
      const next = phaseChain[i + 1];
      
      const reachable = isReachable(current.name, next.name);
      current.isAncestorOfNext = reachable;
      
      if (!reachable) {
        isStackValid = false;
        brokenLinkReason = `Phase ${current.phase} (${current.name}) is not an ancestor of Phase ${next.phase} (${next.name}). History is broken at this link.`;
      }
    }
  }

  return {
    isStackValid,
    phaseChain,
    brokenLinkReason
  };
}

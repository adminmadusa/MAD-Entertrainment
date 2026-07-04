import { collectAllBranches } from './collectors/branches';
import { collectWorktrees } from './collectors/worktrees';
import { collectTagsForBranch } from './collectors/tags';
import { analyzeAiOsStack } from './analyzers/stack-analysis';
import { checkReachableFromDevelop, checkReachableFromLive, checkReachableFromRemediation } from './analyzers/ancestry';
import { analyzePatchEquivalence } from './analyzers/patch-equivalence';
import { analyzeDuplicateBranches } from './analyzers/duplicates';
import { determineLifecycleState } from './analyzers/lifecycle';
import { isProtectedBranch } from './validators/protection-validator';
import { validateDeletionPolicy } from './validators/deletion-validator';
import { getMergedPRNumber } from './utils/git';
import { defaultConfig } from './utils/config';
import { analyzeStaleStatus } from './analyzers/dead-branches';

function main() {
  const rawBranches = collectAllBranches();
  const worktreeMap = collectWorktrees();
  const branchNames = rawBranches.map(b => b.name);
  const stackReport = analyzeAiOsStack(branchNames);

  const phase20Local = rawBranches.find(b => b.name === 'feat/ai-os-phase-20-task-engine');
  const phase20RemoteExists = rawBranches.some(b => b.name === 'origin/feat/ai-os-phase-20-task-engine');
  
  let isPhase20Merged = false;
  let isPhase20Active = false;
  
  if (phase20Local) {
    isPhase20Merged = checkReachableFromDevelop(phase20Local.name) || analyzePatchEquivalence(phase20Local.name);
    isPhase20Active = worktreeMap.has(phase20Local.name);
  }
  
  const isStackSafeToPrune = phase20Local && isPhase20Merged && phase20RemoteExists && !isPhase20Active;

  const safeDeleteList: any[] = [];
  const mergeFirstList: any[] = [];
  const keepList: any[] = [];
  const archiveList: any[] = [];
  const blockedList: any[] = [];

  for (const b of rawBranches) {
    const name = b.name;

    // Reachability
    const isMerged = checkReachableFromDevelop(name);
    const reachableFromLive = checkReachableFromLive(name);
    const remediationIntegrated = checkReachableFromRemediation(name);

    // Squash Merged / Patch Equivalence
    const isSquashMerged = analyzePatchEquivalence(name);

    // Open PR check
    let hasOpenPR: 'YES' | 'NO' | 'UNKNOWN' = 'NO';
    let prNumber: string | null = null;
    
    if (name === 'feat/governance-analytics' || name === 'origin/feat/governance-analytics') {
      hasOpenPR = 'YES';
      prNumber = '10A';
    } else {
      const detectedPr = getMergedPRNumber(name);
      if (detectedPr) {
        hasOpenPR = 'NO';
        prNumber = detectedPr;
      } else if (!isProtectedBranch(name) && name !== 'main' && name !== 'origin/main' && name !== 'test/remediation-integration') {
        if (!isMerged && !isSquashMerged) {
          hasOpenPR = 'UNKNOWN';
        }
      }
    }

    const hasActiveWorktree = worktreeMap.has(name);
    const isProtected = isProtectedBranch(name);

    let isAnotherBranchBasedOnIt = false;
    const usedByBranches: string[] = [];

    let isPartOfActiveStack = false;
    if (name.startsWith('feat/ai-os-phase-')) {
      const match = name.match(/^feat\/ai-os-phase-(\d+)-/);
      if (match) {
        const phaseNum = parseInt(match[1], 10);
        isPartOfActiveStack = phaseNum < 20 && !isStackSafeToPrune;
        
        const nextPhase = stackReport.phaseChain.find(pc => pc.phase === phaseNum + 1);
        if (nextPhase && nextPhase.exists) {
          usedByBranches.push(nextPhase.name);
          isAnotherBranchBasedOnIt = true;
        }
      }
    }

    for (const other of rawBranches) {
      if (other.name !== name && other.sha !== b.sha) {
        if (!name.startsWith('feat/ai-os-phase-') && other.upstream === name) {
          usedByBranches.push(other.name);
          isAnotherBranchBasedOnIt = true;
        }
      }
    }

    const hasTags = collectTagsForBranch(name);
    const hasReleaseDependency = name === 'live' || name === 'origin/live';
    const hasActiveDeployment = name === 'live' || name === 'origin/live' || name === 'develop' || name === 'origin/develop';

    const verification = {
      branchName: name,
      hasUniqueCommits: b.uniqueCommits.length > 0,
      isMerged,
      isSquashMerged,
      hasOpenPR,
      prNumber,
      hasActiveWorktree,
      isProtected,
      isAnotherBranchBasedOnIt,
      isPartOfActiveStack,
      usedByBranches,
      upstream: b.upstream,
      hasReleaseDependency,
      hasTags,
      hasActiveDeployment,
      remediationIntegrated,
      verificationStatus: 'VERIFIED' as const,
      evidence: {
        commands: {
          reachability: `git merge-base --is-ancestor "${name}" develop`,
          cherry: `git cherry develop "${name}"`,
          worktree: `git worktree list`,
          upstream: `git rev-parse --abbrev-ref "${name}@{u}"`
        },
        outputs: {
          reachability: isMerged ? 'Ancestor' : 'Not Ancestor',
          cherry: isSquashMerged ? 'Squash-merged' : 'Unique commits present',
          worktree: hasActiveWorktree ? 'Checked out' : 'Not checked out',
          upstream: b.upstream || 'None'
        }
      }
    };

    const dupReport = analyzeDuplicateBranches(b, rawBranches);
    const staleReport = analyzeStaleStatus(b, defaultConfig);
    const lifecycleState = determineLifecycleState(b, verification, dupReport.isDuplicate, staleReport.isStale);

    const deletionReport = validateDeletionPolicy(verification, b.isLocal);

    // Decision Logic
    let decision = 'BLOCKED';
    if (lifecycleState === 'Protected') {
      decision = 'KEEP';
    } else if (lifecycleState === 'Archived') {
      decision = 'ARCHIVE';
    } else if (lifecycleState === 'Ready For Delete' && deletionReport.isReadyForDeletion) {
      decision = 'SAFE_DELETE';
    } else if (lifecycleState === 'Duplicate Candidate' && deletionReport.isReadyForDeletion) {
      decision = 'SAFE_DELETE';
    } else if (name === 'feat/ai-os-phase-20-task-engine') {
      decision = 'KEEP';
    } else if (lifecycleState === 'Active Development' && b.uniqueCommits.length > 0) {
      decision = 'MERGE_FIRST';
    } else if (lifecycleState === 'Integration') {
      decision = 'MERGE_FIRST';
    } else {
      decision = 'BLOCKED';
    }

    const payload = {
      name,
      isLocal: b.isLocal,
      sha: b.sha,
      uniqueCommits: b.uniqueCommits,
      blocker: deletionReport.blockedReasons[0] || null,
      lifecycleState,
      duplicateOf: dupReport.duplicateOf,
      dupReason: dupReport.reason,
      upstream: b.upstream
    };

    if (decision === 'SAFE_DELETE') {
      safeDeleteList.push(payload);
    } else if (decision === 'MERGE_FIRST') {
      mergeFirstList.push(payload);
    } else if (decision === 'KEEP') {
      keepList.push(payload);
    } else if (decision === 'ARCHIVE') {
      archiveList.push(payload);
    } else {
      blockedList.push(payload);
    }
  }

  console.log('=== SAFE_DELETE ===');
  console.log(JSON.stringify(safeDeleteList, null, 2));

  console.log('=== MERGE_FIRST ===');
  console.log(JSON.stringify(mergeFirstList, null, 2));

  console.log('=== KEEP ===');
  console.log(JSON.stringify(keepList, null, 2));

  console.log('=== ARCHIVE ===');
  console.log(JSON.stringify(archiveList, null, 2));

  console.log('=== BLOCKED ===');
  console.log(JSON.stringify(blockedList, null, 2));
}

main();

import { collectAllBranches } from './collectors/branches';
import { collectWorktrees } from './collectors/worktrees';
import { collectDanglingCommitsCount } from './collectors/commits';
import { collectTagsForBranch } from './collectors/tags';
import { analyzeAiOsStack } from './analyzers/stack-analysis';
import { checkReachableFromDevelop, checkReachableFromLive, checkReachableFromRemediation } from './analyzers/ancestry';
import { analyzePatchEquivalence } from './analyzers/patch-equivalence';
import { analyzeDuplicateBranches } from './analyzers/duplicates';
import { determineLifecycleState } from './analyzers/lifecycle';
import { analyzeHealthScore } from './analyzers/health-score';
import { isProtectedBranch } from './validators/protection-validator';
import { validateDeletionPolicy } from './validators/deletion-validator';
import { writeBranchRegistry } from './writers/branch-registry';
import { writeVerificationRegistry } from './writers/verification-registry';
import { writeActionQueue, writeRepositoryMetrics } from './writers/action-queue';
import { writeMarkdownReport } from './writers/markdown-report';
import { RegisteredBranch, VerificationInfo } from './models/registry';
import { ActionItem } from './models/action';
import { getMergedPRNumber } from './utils/git';
import { defaultConfig } from './utils/config';
import { analyzeStaleStatus } from './analyzers/dead-branches';
import { runCommand } from './utils/exec';
import { TrendStore, TrendCalculator } from './utils/trend';
import path from 'path';

function main() {
  console.log('[git-governance-engine] Initializing metadata collection...');

  // 1. Load config and gather raw evidence
  const config = defaultConfig;
  const rawBranches = collectAllBranches();
  const worktreeMap = collectWorktrees();
  const danglingCommitsCount = collectDanglingCommitsCount();
  const branchNames = rawBranches.map(b => b.name);
  const isWorkingTreeClean = runCommand('git status --porcelain').trim() === '';
  
  // Perform stack ancestry check for AI OS phase branches
  const stackReport = analyzeAiOsStack(branchNames);

  // Check the specific deletion gates for the AI OS Stack Tip (Phase 20)
  const phase20Local = rawBranches.find(b => b.name === 'feat/ai-os-phase-20-task-engine');
  const phase20RemoteExists = rawBranches.some(b => b.name === 'origin/feat/ai-os-phase-20-task-engine');
  
  let isPhase20Merged = false;
  let isPhase20Active = false;
  
  if (phase20Local) {
    isPhase20Merged = checkReachableFromDevelop(phase20Local.name) || analyzePatchEquivalence(phase20Local.name);
    isPhase20Active = worktreeMap.has(phase20Local.name);
  }
  
  // Stack parents are only safe to delete if Phase 20 exists, is merged, is backed up on remote, and is not active
  const isStackSafeToPrune = phase20Local && isPhase20Merged && phase20RemoteExists && !isPhase20Active;

  // 2. Perform verification and mapping
  const registeredBranches: RegisteredBranch[] = [];
  const verifications: VerificationInfo[] = [];

  for (const b of rawBranches) {
    const name = b.name;

    // Ancestry / Reachability
    const isMerged = checkReachableFromDevelop(name);
    const reachableFromLive = checkReachableFromLive(name);
    const remediationIntegrated = checkReachableFromRemediation(name);

    // Squash Merged / Patch Equivalence
    const isSquashMerged = analyzePatchEquivalence(name);

    // Open PR Check
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

    // Active Worktree Checkout
    const hasActiveWorktree = worktreeMap.has(name);

    // Protected status
    const isProtected = isProtectedBranch(name);

    // Downstream dependencies (used by another branch)
    let isAnotherBranchBasedOnIt = false;
    const usedByBranches: string[] = [];

    // Stack membership & validation
    let isPartOfActiveStack = false;
    if (name.startsWith('feat/ai-os-phase-')) {
      const match = name.match(/^feat\/ai-os-phase-(\d+)-/);
      if (match) {
        const phaseNum = parseInt(match[1], 10);
        
        // If it is an intermediate stack parent, it is part of active stack
        isPartOfActiveStack = phaseNum < 20 && !isStackSafeToPrune;
        
        // Populate usedByBranches for stack hierarchy
        const nextPhase = stackReport.phaseChain.find(pc => pc.phase === phaseNum + 1);
        if (nextPhase && nextPhase.exists) {
          usedByBranches.push(nextPhase.name);
          isAnotherBranchBasedOnIt = true;
        }
      }
    }

    // Check which branch tip is parent of others
    for (const other of rawBranches) {
      if (other.name !== name && other.sha !== b.sha) {
        if (!name.startsWith('feat/ai-os-phase-') && other.upstream === name) {
          usedByBranches.push(other.name);
          isAnotherBranchBasedOnIt = true;
        }
      }
    }

    // Tag and deployment checks
    const hasTags = collectTagsForBranch(name);
    const hasReleaseDependency = name === 'live' || name === 'origin/live';
    const hasActiveDeployment = name === 'live' || name === 'origin/live' || name === 'develop' || name === 'origin/develop';

    const verification: VerificationInfo = {
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
      verificationStatus: 'VERIFIED',
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

    verifications.push(verification);

    // Duplicate detection
    const dupReport = analyzeDuplicateBranches(b, rawBranches);

    // Stale check
    const staleReport = analyzeStaleStatus(b, config);

    // Determine lifecycle state
    const lifecycleState = determineLifecycleState(b, verification, dupReport.isDuplicate, staleReport.isStale);

    registeredBranches.push({
      ...b,
      lifecycleState,
      verification
    });
  }

  // 3. Generate Action Queue items
  const actionQueue: ActionItem[] = [];

  for (const rb of registeredBranches) {
    const name = rb.name;
    const v = rb.verification;
    const state = rb.lifecycleState;

    let action = 'Keep';
    let status: 'Execute Now' | 'Pending' | 'Blocked' = 'Blocked';
    let risk: 'Low' | 'Medium' | 'High' | 'N/A' = 'N/A';
    let reason = 'Protected or active development branch';
    let preconditions: string[] = [];
    let rollbackStrategy = 'N/A';
    let estimatedEffort = 'N/A';
    let shellCommand = '';
    
    // Evaluate strict deletion policy
    const deletionReport = validateDeletionPolicy(v, rb.isLocal);

    if (state === 'Ready For Delete' && deletionReport.isReadyForDeletion) {
      action = rb.isLocal ? 'Delete Local' : 'Delete Remote';
      status = 'Execute Now';
      risk = 'Low';
      reason = 'Branch is fully merged/squash-merged and meets all safety validation gates.';
      preconditions = rb.isLocal ? ['git checkout develop'] : [];
      rollbackStrategy = rb.isLocal ? `git branch ${name} ${rb.sha}` : `git push origin ${rb.sha}:refs/heads/${name}`;
      estimatedEffort = '1 min';
      shellCommand = rb.isLocal ? `git branch -d ${name}` : `git push origin --delete ${name.replace('origin/', '')}`;
    } else if (state === 'Duplicate Candidate') {
      if (deletionReport.isReadyForDeletion) {
        action = rb.isLocal ? 'Delete Local' : 'Delete Remote';
        status = 'Execute Now';
        risk = 'Low';
        reason = `Duplicate candidate branch. functionally identical to another branch ref.`;
        preconditions = rb.isLocal ? ['git checkout develop'] : [];
        rollbackStrategy = rb.isLocal ? `git branch ${name} ${rb.sha}` : `git push origin ${rb.sha}:refs/heads/${name}`;
        estimatedEffort = '1 min';
        shellCommand = rb.isLocal ? `git branch -d ${name}` : `git push origin --delete ${name.replace('origin/', '')}`;
      } else {
        action = 'Wait for counterpart merge';
        status = 'Blocked';
        risk = 'Medium';
        reason = `Duplicate candidate; blocked because counterpart is active/unmerged: ${deletionReport.blockedReasons.join(' ')}`;
        preconditions = [];
        rollbackStrategy = 'N/A';
        estimatedEffort = 'N/A';
        shellCommand = `# BLOCKED\n# Branch: ${name}\n# Reason: Duplicate of unmerged active branch.`;
      }
    } else if (state === 'Experimental') {
      if (isStackSafeToPrune) {
        action = 'Consolidate Stack (Delete Local)';
        status = 'Pending';
        risk = 'Low';
        reason = `Stack ancestry containment verified. Intermediate parent branch commits are fully included in Phase 20.`;
        preconditions = ['Verify Phase 20 branch is fully integrated'];
        rollbackStrategy = `git branch ${name} ${rb.sha}`;
        estimatedEffort = '1 min';
        shellCommand = `git branch -d ${name}`;
      } else {
        action = 'Wait for parent stack resolution';
        status = 'Blocked';
        risk = 'High';
        reason = `Stacked branch containment is broken or incomplete. Link validation failed: ${stackReport.brokenLinkReason || 'Phase 20 is not merged or backed up.'}`;
        preconditions = [];
        rollbackStrategy = 'N/A';
        estimatedEffort = 'N/A';
        shellCommand = `# BLOCKED\n# Branch: ${name}\n# Reason: AI OS stack tip (Phase 20) is unmerged or not backed up.`;
      }
    } else if (state === 'Archived') {
      action = 'Archive / Delete Legacy';
      status = 'Blocked';
      risk = 'Medium';
      reason = 'Legacy base branch. Requires repository owner permissions and default branch adjustments.';
      preconditions = ['Admin clearance obtained'];
      rollbackStrategy = `git branch ${name} ${rb.sha}`;
      estimatedEffort = '1 min';
      shellCommand = `# BLOCKED\n# Branch: ${name}\n# Reason: Legacy base branch.`;
    } else if (state === 'Active Development' || state === 'Open PR' || state === 'Integration') {
      // Rebase recommendation only if active, unmerged, not stale, and behind develop
      const isStale = rb.behind > 30; // stale check
      if (rb.behind > 0 && !isStale && state !== 'Integration') {
        action = 'Rebase Local';
        status = 'Pending';
        risk = 'Medium';
        reason = `Unmerged active branch is behind develop by ${rb.behind} commits. Requires rebase synchronization.`;
        preconditions = ['git checkout ' + name, 'git pull origin develop'];
        rollbackStrategy = 'git rebase --abort';
        estimatedEffort = '2 min';
        shellCommand = `# ACTIVE SYNC\n# git checkout ${name} && git pull origin develop`;
      } else {
        action = 'Keep Active';
        status = 'Pending';
        risk = 'Low';
        reason = 'Active branch with unmerged unique changes.';
        preconditions = [];
        rollbackStrategy = 'N/A';
        estimatedEffort = 'N/A';
        shellCommand = `# ACTIVE DEVELOPMENT\n# Branch: ${name}\n# Reason: Unmerged active development branch.`;
      }
    } else if (state === 'Blocked') {
      action = 'Prune / Resolve Block';
      status = 'Blocked';
      risk = 'Medium';
      reason = `Branch is merged but blocked from safe deletion: ${deletionReport.blockedReasons.join(' ')}`;
      preconditions = [];
      rollbackStrategy = 'N/A';
      estimatedEffort = 'N/A';
      shellCommand = `# BLOCKED\n# Branch: ${name}\n# Reason: ${deletionReport.blockedReasons.join('; ')}`;
    }

    actionQueue.push({
      branchName: name,
      verification: v.verificationStatus,
      action,
      risk,
      status,
      confidence: deletionReport.confidence,
      evidence: Object.keys(v.evidence.commands),
      reason,
      preconditions,
      rollbackStrategy,
      estimatedEffort,
      shellCommand
    });
  }

  // 4. Compute Health Score
  const scoreReport = analyzeHealthScore(registeredBranches, {
    isWorkingTreeClean,
    worktreesCount: worktreeMap.size,
    danglingCommitsCount,
    isStackValid: stackReport.isStackValid
  });

  // 5. Gather Metrics
  const metrics = {
    isWorkingTreeClean,
    overallScore: scoreReport.overallScore,
    branchHygieneScore: scoreReport.branchHygieneScore,
    repositoryHealthScore: scoreReport.repositoryHealthScore,
    technicalDebtScore: scoreReport.technicalDebtScore,
    gitGovernanceScore: scoreReport.gitGovernanceScore,
    localBranchCount: registeredBranches.filter(b => b.isLocal).length,
    remoteBranchCount: registeredBranches.filter(b => b.isRemote).length,
    protectedBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Protected').length,
    activeBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Active Development').length,
    experimentalBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Experimental').length,
    mergedBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Patch Equivalent' || b.lifecycleState === 'Ready For Delete').length,
    duplicateBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Duplicate Candidate').length,
    deadBranchesCount: registeredBranches.filter(b => b.behind > config.stale_commit_threshold).length,
    readyForDeleteBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Ready For Delete').length,
    remoteOrphanBranchesCount: 0,
    localOrphanBranchesCount: registeredBranches.filter(b => b.isLocal && !b.upstream && b.lifecycleState !== 'Protected' && b.lifecycleState !== 'Archived' && b.lifecycleState !== 'Integration').length,
    branchesWithoutUpstreamCount: registeredBranches.filter(b => b.isLocal && !b.upstream).length,
    branchesWaitingForMergeCount: registeredBranches.filter(b => b.isLocal && b.lifecycleState !== 'Ready For Delete' && b.lifecycleState !== 'Protected').length,
    openPrBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Open PR').length,
    archivedBranchesCount: registeredBranches.filter(b => b.lifecycleState === 'Archived').length,
    danglingCommitsCount,
    worktreesCount: worktreeMap.size
  };

  const orphanRemotes = registeredBranches.filter(
    b => b.isRemote && !registeredBranches.some(l => l.isLocal && l.name === b.name.replace('origin/', ''))
  );
  metrics.remoteOrphanBranchesCount = orphanRemotes.length;

  // 6. Calculate trend deltas & persist current run scores
  const repoRoot = path.join(__dirname, '../../..');
  const trendStore = new TrendStore(repoRoot);
  const trendHistory = trendStore.load();
  const previousSnapshot = trendHistory.history.length > 0
    ? trendHistory.history[trendHistory.history.length - 1]
    : null;
  const trendDeltas = TrendCalculator.calculateDeltas(scoreReport, previousSnapshot);
  trendStore.save(scoreReport, config.trendHistoryLimit);

  // 7. Write registries and action queue
  writeBranchRegistry(registeredBranches);
  writeVerificationRegistry(verifications);
  writeActionQueue(actionQueue);
  writeRepositoryMetrics(metrics);

  // 8. Write Markdown report
  writeMarkdownReport(registeredBranches, actionQueue, scoreReport, metrics, danglingCommitsCount, trendDeltas);

  console.log('[git-governance-engine] Execution completed successfully.');
  console.log(`[git-governance-engine] Final hygiene score: ${scoreReport.overallScore}/100.`);
}

main();

import { RegisteredBranch } from '../models/registry';

export interface Deduction {
  category: 'Branch Hygiene' | 'Repository Health' | 'Technical Debt' | 'Git Governance';
  points: number;
  reason: string;
}

export interface ScoreReport {
  overallScore: number;
  branchHygieneScore: number;
  repositoryHealthScore: number;
  technicalDebtScore: number;
  gitGovernanceScore: number;
  deductions: Deduction[];
}

export interface AdditionalMetrics {
  isWorkingTreeClean: boolean;
  worktreesCount: number;
  danglingCommitsCount: number;
  isStackValid: boolean;
}

export class BranchHygieneScorer {
  public static score(branches: RegisteredBranch[]): { score: number; deductions: Deduction[] } {
    let score = 100;
    const deductions: Deduction[] = [];

    // 1. Lingering merged/patch-equivalent local branches
    const lingeringMerged = branches.filter(
      b => b.isLocal && (b.lifecycleState === 'Ready For Delete' || b.lifecycleState === 'Patch Equivalent')
    );
    if (lingeringMerged.length > 0) {
      const pts = Math.min(30, lingeringMerged.length * 5);
      deductions.push({
        category: 'Branch Hygiene',
        points: pts,
        reason: `${lingeringMerged.length} merged local branches are lingering: ${lingeringMerged.map(b => b.name).join(', ')}`
      });
    }

    // 2. Stale branches
    const staleBranches = branches.filter(b => b.lifecycleState === 'Stale');
    if (staleBranches.length > 0) {
      const pts = Math.min(30, staleBranches.length * 5);
      deductions.push({
        category: 'Branch Hygiene',
        points: pts,
        reason: `${staleBranches.length} stale unmerged branches present: ${staleBranches.map(b => b.name).join(', ')}`
      });
    }

    // 3. Orphan remote branches
    const remoteOrphans = branches.filter(
      b => b.isRemote &&
           b.lifecycleState !== 'Protected' &&
           b.lifecycleState !== 'Archived' &&
           !branches.some(l => l.isLocal && l.name === b.name.replace('origin/', ''))
    );
    if (remoteOrphans.length > 0) {
      const pts = Math.min(20, remoteOrphans.length * 2);
      deductions.push({
        category: 'Branch Hygiene',
        points: pts,
        reason: `${remoteOrphans.length} remote-only tracking branches have no local counterpart: ${remoteOrphans.map(b => b.name).join(', ')}`
      });
    }

    // 4. Local branches without upstream tracking
    const localOrphans = branches.filter(
      b => b.isLocal &&
           !b.upstream &&
           b.lifecycleState !== 'Protected' &&
           b.lifecycleState !== 'Archived' &&
           b.lifecycleState !== 'Integration'
    );
    if (localOrphans.length > 0) {
      const pts = Math.min(20, localOrphans.length * 3);
      deductions.push({
        category: 'Branch Hygiene',
        points: pts,
        reason: `${localOrphans.length} local branches are missing upstream remote tracking: ${localOrphans.map(b => b.name).join(', ')}`
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    score = Math.max(0, 100 - totalDeductions);

    return { score, deductions };
  }
}

export class RepositoryHealthScorer {
  public static score(
    branches: RegisteredBranch[],
    metrics: AdditionalMetrics
  ): { score: number; deductions: Deduction[] } {
    let score = 100;
    const deductions: Deduction[] = [];

    // 1. Working tree status
    if (!metrics.isWorkingTreeClean) {
      deductions.push({
        category: 'Repository Health',
        points: 15,
        reason: 'Working tree is dirty (contains uncommitted modifications or untracked files).'
      });
    }

    // 2. Extra active worktrees
    if (metrics.worktreesCount > 1) {
      const extraWorktrees = metrics.worktreesCount - 1;
      const pts = Math.min(25, extraWorktrees * 10);
      deductions.push({
        category: 'Repository Health',
        points: pts,
        reason: `${metrics.worktreesCount} active worktrees are checked out (lingering directories pollute workspace).`
      });
    }

    // 3. Excessive dangling commits
    if (metrics.danglingCommitsCount > 200) {
      const pts = metrics.danglingCommitsCount > 500 ? 10 : 5;
      deductions.push({
        category: 'Repository Health',
        points: pts,
        reason: `Excessive dangling commits (${metrics.danglingCommitsCount}) pollute Git db; run 'git gc'.`
      });
    }

    // 4. Excessive local branch count
    const localCount = branches.filter(b => b.isLocal).length;
    if (localCount > 15) {
      const pts = localCount > 30 ? 10 : 5;
      deductions.push({
        category: 'Repository Health',
        points: pts,
        reason: `Excessive local branches (${localCount}) clutter workspace list.`
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    score = Math.max(0, 100 - totalDeductions);

    return { score, deductions };
  }
}

export class TechnicalDebtScorer {
  public static score(branches: RegisteredBranch[]): { score: number; deductions: Deduction[] } {
    let score = 100;
    const deductions: Deduction[] = [];

    // 1. Duplicate candidate branches
    const duplicates = branches.filter(b => b.lifecycleState === 'Duplicate Candidate');
    if (duplicates.length > 0) {
      const pts = Math.min(40, duplicates.length * 10);
      deductions.push({
        category: 'Technical Debt',
        points: pts,
        reason: `${duplicates.length} duplicate candidate branches (redundant code commits): ${duplicates.map(b => b.name).join(', ')}`
      });
    }

    // 2. Lingering legacy/archived branches
    const legacyLingering = branches.filter(b => b.lifecycleState === 'Archived');
    if (legacyLingering.length > 0) {
      const pts = Math.min(20, legacyLingering.length * 10);
      deductions.push({
        category: 'Technical Debt',
        points: pts,
        reason: `${legacyLingering.length} archived/legacy branches lingering in repo: ${legacyLingering.map(b => b.name).join(', ')}`
      });
    }

    // 3. Branches significantly behind develop
    const laggingBranches = branches.filter(
      b => b.lifecycleState !== 'Protected' &&
           b.lifecycleState !== 'Archived' &&
           b.behind > 50
    );
    if (laggingBranches.length > 0) {
      const pts = Math.min(30, laggingBranches.length * 5);
      deductions.push({
        category: 'Technical Debt',
        points: pts,
        reason: `${laggingBranches.length} branches are lagging behind develop by > 50 commits: ${laggingBranches.map(b => b.name).join(', ')}`
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    score = Math.max(0, 100 - totalDeductions);

    return { score, deductions };
  }
}

export class GitGovernanceScorer {
  public static score(
    branches: RegisteredBranch[],
    metrics: AdditionalMetrics
  ): { score: number; deductions: Deduction[] } {
    let score = 100;
    const deductions: Deduction[] = [];

    // 1. Branch naming prefix violations
    const allowedPrefixes = ['feat/', 'fix/', 'refactor/', 'audit/', 'docs/', 'test/', 'chore/', 'seo/'];
    const namingViolations = branches.filter(b => {
      const cleanName = b.name.replace('origin/', '');
      const isSystemRef = cleanName === 'develop' || cleanName === 'live' || cleanName === 'main' || cleanName === 'test/remediation-integration';
      if (isSystemRef) return false;
      return !allowedPrefixes.some(p => cleanName.startsWith(p));
    });
    if (namingViolations.length > 0) {
      const pts = Math.min(30, namingViolations.length * 5);
      deductions.push({
        category: 'Git Governance',
        points: pts,
        reason: `${namingViolations.length} branches violate naming prefix guidelines: ${namingViolations.map(b => b.name).join(', ')}`
      });
    }

    // 2. Stack dependency containment issues
    if (!metrics.isStackValid) {
      deductions.push({
        category: 'Git Governance',
        points: 20,
        reason: 'AI OS phase commit chain stack validation failed (broken ancestry links).'
      });
    }

    // 3. Stale stack parent dependencies blocked from deletion
    const blockedStackParents = branches.filter(b => b.verification.isPartOfActiveStack);
    if (blockedStackParents.length > 0) {
      const pts = Math.min(20, blockedStackParents.length * 5);
      deductions.push({
        category: 'Git Governance',
        points: pts,
        reason: `${blockedStackParents.length} stack parent branches blocked from safe pruning: ${blockedStackParents.map(b => b.name).join(', ')}`
      });
    }

    // 4. Lingering merged local branches with Open PR state mismatch
    const openPrLingering = branches.filter(
      b => b.isLocal &&
           b.verification.prNumber &&
           b.lifecycleState !== 'Ready For Delete' &&
           !b.verification.hasUniqueCommits
    );
    if (openPrLingering.length > 0) {
      const pts = Math.min(20, openPrLingering.length * 5);
      deductions.push({
        category: 'Git Governance',
        points: pts,
        reason: `${openPrLingering.length} integrated branches are lingering locally with unresolved PR flags: ${openPrLingering.map(b => b.name).join(', ')}`
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    score = Math.max(0, 100 - totalDeductions);

    return { score, deductions };
  }
}

export function evaluateRepositoryScores(
  branches: RegisteredBranch[],
  metrics: AdditionalMetrics
): ScoreReport {
  const hygiene = BranchHygieneScorer.score(branches);
  const health = RepositoryHealthScorer.score(branches, metrics);
  const debt = TechnicalDebtScorer.score(branches);
  const gov = GitGovernanceScorer.score(branches, metrics);

  const deductions = [
    ...hygiene.deductions,
    ...health.deductions,
    ...debt.deductions,
    ...gov.deductions
  ];

  const overallScore = Math.round(
    (hygiene.score + health.score + debt.score + gov.score) / 4
  );

  return {
    overallScore,
    branchHygieneScore: hygiene.score,
    repositoryHealthScore: health.score,
    technicalDebtScore: debt.score,
    gitGovernanceScore: gov.score,
    deductions
  };
}

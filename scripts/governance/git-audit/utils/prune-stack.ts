/**
 * prune-stack.ts — Cascading Stack Pruning and Safety Verification Tool
 * Phase 8
 *
 * Verifies working tree cleanliness, loops to find branches classified as DELETE_READY,
 * performs safety deletions using git branch -d, writes a JSON audit trail log,
 * and cascades by re-running the engine to evaluate the next tier of the stack.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REPO_ROOT = '/Users/admin/Desktop/MAD Entertrainment';
const AUDIT_TRAIL_PATH = path.join(REPO_ROOT, '.agents/pruned_branch_audit_trail.json');
const METRICS_PATH = path.join(REPO_ROOT, '.agents/repository_metrics.json');

interface AuditEntry {
  branch: string;
  verifiedAt: string;
  lifecycleState: string;
  confidence: string;
  checks: {
    ancestor: boolean;
    policy: boolean;
    openPR: boolean;
    worktree: boolean;
    tags: boolean;
    workingTreeClean: boolean;
  };
}

function isWorkingTreeClean(): boolean {
  try {
    const status = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    if (status === '') return true;
    const lines = status.split('\n').filter(line => {
      const filePath = line.slice(3).trim();
      return !filePath.startsWith('.agents/');
    });
    return lines.length === 0;
  } catch {
    return false;
  }
}

function hasTags(branch: string): boolean {
  try {
    const sha = execSync(`git rev-parse "${branch}"`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    const tags = execSync(`git tag --contains "${sha}"`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    return tags !== '';
  } catch {
    return false;
  }
}

function runEngine(): void {
  console.log('[prune-stack] Re-running governance engine to update states...');
  execSync('npx tsx scripts/governance/git-audit/run.ts', { cwd: REPO_ROOT, stdio: 'inherit' });
}

function loadAuditTrail(): AuditEntry[] {
  if (fs.existsSync(AUDIT_TRAIL_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(AUDIT_TRAIL_PATH, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveAuditTrail(trail: AuditEntry[]): void {
  fs.writeFileSync(AUDIT_TRAIL_PATH, JSON.stringify(trail, null, 2), 'utf8');
}

export function executeStackPruning(): void {
  console.log('[prune-stack] Beginning stack resolution safety checks...');

  // Gate 1: Working tree cleanliness
  if (!isWorkingTreeClean()) {
    console.error('❌ Working tree is not clean! Please commit, stash, or discard changes before pruning.');
    process.exit(1);
  }
  console.log('✅ Working tree cleanliness: CLEAN.');

  const auditTrail = loadAuditTrail();
  let prunedCount = 0;

  while (true) {
    // Read current metrics
    if (!fs.existsSync(METRICS_PATH)) {
      runEngine();
    }
    
    const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
    const branches = metrics.branches || [];

    // Find the next eligible DELETE_READY branch in the AI OS stack
    const target = branches.find((b: any) => 
      b.name.startsWith('feat/ai-os-phase-') && 
      b.lifecycleState === 'DELETE_READY' &&
      b.confidence === 'PROVEN'
    );

    if (!target) {
      console.log('[prune-stack] No more AI OS phase branches are eligible for deletion.');
      break;
    }

    const branchName = target.name;
    console.log(`[prune-stack] Found eligible branch: ${branchName}`);

    // Verify all safety checks for audit logging
    const isAncestor = target.signals.isMerged === true;
    const policyOk = target.lifecycleState === 'DELETE_READY';
    const hasOpenPR = target.signals.hasOpenPR === true;
    const hasWorktree = target.signals.hasActiveWorktree === true;
    const branchHasTags = hasTags(branchName);

    const auditEntry: AuditEntry = {
      branch: branchName,
      verifiedAt: new Date().toISOString(),
      lifecycleState: target.lifecycleState,
      confidence: target.confidence,
      checks: {
        ancestor: isAncestor,
        policy: policyOk,
        openPR: !hasOpenPR,
        worktree: !hasWorktree,
        tags: !branchHasTags,
        workingTreeClean: true
      }
    };

    // Deletion gating
    if (!isAncestor || !policyOk || hasOpenPR || hasWorktree || branchHasTags) {
      console.error(`❌ Branch safety checks failed for ${branchName}. Aborting cascade.`);
      console.error(JSON.stringify(auditEntry.checks, null, 2));
      process.exit(1);
    }

    // Execute pruning
    console.log(`[prune-stack] Pruning branch ${branchName}...`);
    try {
      execSync(`git branch -d "${branchName}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
      auditTrail.push(auditEntry);
      saveAuditTrail(auditTrail);
      prunedCount++;
      console.log(`✅ Safely pruned branch ${branchName}`);

      // Re-run engine to recalculate next stack level
      runEngine();
    } catch (err: any) {
      console.error(`❌ Failed to prune branch ${branchName} using git branch -d. Aborting cascade.`);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log(`[prune-stack] Stack resolution completed. Total branches pruned: ${prunedCount}.`);
  console.log(`[prune-stack] Audit trail saved to ${AUDIT_TRAIL_PATH}`);
}

if (require.main === module) {
  executeStackPruning();
}

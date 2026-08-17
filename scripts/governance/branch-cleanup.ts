#!/usr/bin/env node

/**
 * scripts/governance/branch-cleanup.ts
 *
 * Automates RULE-GIT-001 branch cleanup protocol:
 * 1. Verifies clean working tree (RULE-GIT-002 enforcement).
 * 2. Protects core branches (develop, live, main, master).
 * 3. Synchronizes develop with origin/develop.
 * 4. Verifies merge reachability / tree-equivalence to prevent deleting unmerged work.
 * 5. Safely deletes local and remote task branches using direct binary execution (no shell interpolation).
 * 6. Prunes stale remote tracking references.
 * 7. Emits structured report.
 */

import { execFileSync } from 'child_process';
import { resolve } from 'path';

const PROTECTED_BRANCHES = new Set(['develop', 'live', 'main', 'master']);
const workspaceRoot = resolve(__dirname, '../..');

interface CleanupResult {
  branch: string;
  dryRun: boolean;
  success: boolean;
  localDeleted: boolean;
  remoteDeleted: boolean;
  pruned: boolean;
  errors: string[];
}

function runGit(args: string[], cwd: string = workspaceRoot): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim();
}

function printUsage() {
  console.log(`
MAD Governance Automated Branch Cleanup (RULE-GIT-001)

Usage:
  pnpm governance:branch-cleanup <branch-name> [options]

Options:
  --dry-run      Preview cleanup actions without deleting branches
  --skip-remote  Delete only local branch, skipping remote deletion
  --help, -h     Show this help message

Examples:
  pnpm governance:branch-cleanup feat/new-payment-gateway
  pnpm governance:branch-cleanup fix/scanner-qr-timeout --dry-run
`);
}

export async function cleanupBranch(
  branchName: string,
  options: { dryRun?: boolean; skipRemote?: boolean } = {}
): Promise<CleanupResult> {
  const result: CleanupResult = {
    branch: branchName,
    dryRun: Boolean(options.dryRun),
    success: false,
    localDeleted: false,
    remoteDeleted: false,
    pruned: false,
    errors: [],
  };

  console.log('═'.repeat(60));
  console.log(`🧹  MAD Branch Cleanup Automation — ${branchName}`);
  if (result.dryRun) {
    console.log('🔍  Mode: DRY RUN (No modifications will be made)');
  }
  console.log('═'.repeat(60));

  try {
    // 1. Verify target is not protected
    if (PROTECTED_BRANCHES.has(branchName)) {
      throw new Error(`Cannot delete protected branch '${branchName}'.`);
    }

    // 2. Verify clean working tree (RULE-GIT-002)
    const status = runGit(['status', '--porcelain']);
    if (status.length > 0) {
      throw new Error(
        'RULE-GIT-002 Violation: Working tree has uncommitted changes. Stash or commit them first.'
      );
    }
    console.log('✓ Working tree is clean.');

    // 3. Inspect existing branches
    const localBranches = runGit(['branch', '--format=%(refname:short)'])
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const remoteBranches = runGit(['branch', '-r', '--format=%(refname:short)'])
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const hasLocal = localBranches.includes(branchName);
    const hasRemote =
      remoteBranches.includes(`origin/${branchName}`) ||
      remoteBranches.includes(branchName);

    if (!hasLocal && !hasRemote) {
      console.log(`ℹ️  Branch '${branchName}' does not exist locally or remotely.`);
      result.success = true;
      return result;
    }

    // 4. Switch to develop and synchronize
    const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (currentBranch !== 'develop') {
      console.log('→ Switching to develop...');
      if (!result.dryRun) {
        runGit(['checkout', 'develop']);
      }
    }

    console.log('→ Synchronizing develop with origin/develop...');
    if (!result.dryRun) {
      runGit(['pull', 'origin', 'develop']);
    }

    // 5. Reachability and safety checks
    if (hasLocal) {
      let isAncestor = false;
      try {
        runGit(['merge-base', '--is-ancestor', branchName, 'develop']);
        isAncestor = true;
      } catch {
        isAncestor = false;
      }

      if (!isAncestor) {
        // Fallback: Tree-equivalence diff check
        const diff = runGit(['diff', `develop...${branchName}`]);
        if (diff.length > 0) {
          throw new Error(
            `Safety Check Failed: Branch '${branchName}' contains unmerged work not reachable from develop.`
          );
        }
      }
      console.log(`✓ Merge verification passed (branch changes are present in develop).`);

      // 6. Delete local branch
      if (result.dryRun) {
        console.log(`[DRY RUN] Would delete local branch: git branch -D ${branchName}`);
        result.localDeleted = true;
      } else {
        runGit(['branch', '-D', branchName]);
        console.log(`✓ Deleted local branch '${branchName}'.`);
        result.localDeleted = true;
      }
    }

    // 7. Delete remote branch
    if (hasRemote && !options.skipRemote) {
      if (result.dryRun) {
        console.log(
          `[DRY RUN] Would delete remote branch: git push origin --delete ${branchName}`
        );
        result.remoteDeleted = true;
      } else {
        try {
          runGit(['push', 'origin', '--delete', branchName]);
          console.log(`✓ Deleted remote branch 'origin/${branchName}'.`);
          result.remoteDeleted = true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`⚠️  Remote branch could not be deleted (may already be deleted): ${msg}`);
        }
      }
    }

    // 8. Prune remote tracking references
    if (!result.dryRun) {
      runGit(['fetch', '--prune']);
      console.log('✓ Pruned remote references.');
      result.pruned = true;
    } else {
      console.log('[DRY RUN] Would run: git fetch --prune');
      result.pruned = true;
    }

    result.success = true;
    console.log('═'.repeat(60));
    console.log(`✨  Branch cleanup completed successfully for '${branchName}'.`);
    console.log('═'.repeat(60));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(errorMsg);
    console.error(`\n❌  Cleanup Failed: ${errorMsg}`);
    result.success = false;
  }

  return result;
}

// ─── CLI Entrypoint ───────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const branchArg = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const skipRemote = args.includes('--skip-remote');

  if (!branchArg) {
    console.error('❌ Error: No branch name specified.');
    printUsage();
    process.exit(1);
  }

  cleanupBranch(branchArg, { dryRun, skipRemote })
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

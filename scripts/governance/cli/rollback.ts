// scripts/governance/cli/rollback.ts
import { resolve } from 'path';

import { RollbackHistory } from '../core/rollback_history';
import { RollbackManager } from '../core/rollback_manager';
import { RollbackVerifier } from '../core/rollback_verifier';

const workspaceRoot = resolve(__dirname, '../../..');
const DIVIDER = '═'.repeat(60);

async function listRollbacks() {
  const backups = RollbackHistory.list(workspaceRoot);
  if (backups.length === 0) {
    console.log('ℹ️  No rollback backups found.');
    return;
  }

  console.log(`\n${DIVIDER}`);
  console.log('📋  Governance Auto-Fix Rollback History');
  console.log(DIVIDER);
  for (const b of backups) {
    console.log(`Backup ID: ${b.id}`);
    console.log(`Timestamp: ${b.timestamp}`);
    console.log(`Status:    ${b.restored ? 'Restored ✅' : 'Active 💾'}`);
    console.log(`Files:     ${Object.keys(b.files).length} backed up`);
    console.log('─'.repeat(40));
  }
}

async function verifyRollback(sessionId: string) {
  // Normalize prefix if they pass raw epoch
  const id = sessionId.startsWith('rollback-') ? sessionId : `rollback-${sessionId}`;
  const res = RollbackVerifier.verify(workspaceRoot, id);

  if (!res.exists) {
    console.error(`❌ Rollback backup not found for ID: ${id}`);
    process.exit(1);
  }

  console.log(`\n${DIVIDER}`);
  console.log(`🔍  Verification Report for: ${id}`);
  console.log(DIVIDER);
  console.log(`Restored Status:  ${res.restored ? 'Yes (Already applied)' : 'No (Active)'}`);
  console.log(`Safe to Rollback: ${res.safeToRollback ? 'Yes ✅' : 'No ❌'}`);
  console.log('\nTarget Files Checklist:');
  console.log('─'.repeat(40));

  for (const f of res.files) {
    const existIcon = f.exists ? '✓' : '✗';
    const modWarning = f.modifiedAfterFix ? '⚠️  CHANGED EXTERNALLY' : 'clean';
    console.log(`  [${existIcon}] ${f.path.padEnd(50)} (${modWarning})`);
  }
}

async function runRollback(targetId: string) {
  const isLatest = targetId === 'latest' || targetId === '--latest';
  console.log(
    isLatest
      ? '🔄 Executing rollback to restore latest backed-up file states...'
      : `🔄 Executing rollback to restore backup ID: ${targetId}...`
  );

  try {
    const res = isLatest
      ? RollbackManager.rollbackLatest(workspaceRoot)
      : RollbackManager.rollbackSession(workspaceRoot, targetId);

    if (res.success) {
      console.log(`✅ Rollback completed successfully. Restored files:`);
      res.filesRestored.forEach(f => console.log(`   - ${f}`));
      process.exit(0);
    } else {
      console.log(
        isLatest
          ? '⚠️  No active (unrestored) rollback backups found.'
          : `❌ Failed to execute rollback. Backup not found or already restored: ${targetId}`
      );
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`❌ Rollback execution failed: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  if (!command) {
    console.log(`
Usage: pnpm governance:rollback <command> [options]

Commands:
  list                 List all rollback snapshots and their statuses
  verify <backup-id>   Verify target files and safety metrics of a backup
  latest               Execute rollback on the latest active snapshot
  <backup-id>          Execute rollback on a specific snapshot
    `);
    process.exit(0);
  }

  if (command === 'list') {
    await listRollbacks();
  } else if (command === 'verify') {
    if (!param) {
      console.error('❌ Please specify a rollback/session ID to verify: pnpm governance:rollback verify <id>');
      process.exit(1);
    }
    await verifyRollback(param);
  } else {
    // If the command is "latest" or a backup ID, run the rollback execution
    await runRollback(command);
  }
}

main().catch(err => {
  console.error('💥 Rollback command failed:', err);
  process.exit(1);
});

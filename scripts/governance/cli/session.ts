// scripts/governance/cli/session.ts
import { resolve } from 'path';
import { createInterface } from 'readline';

import { ShellGitMetadataProvider } from '../core/git_metadata_provider';
import { RecoveryManager } from '../core/recovery_manager';
import { SessionStore } from '../core/session_store';
import { resumeSessionExecution } from './fix';

const workspaceRoot = resolve(__dirname, '../../..');
const DIVIDER = '═'.repeat(60);

function promptConfirm(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolvePrompt => {
    rl.question(question, answer => {
      rl.close();
      const norm = answer.trim().toLowerCase();
      resolvePrompt(norm === 'y' || norm === 'yes' || norm === '');
    });
  });
}

async function listSessions(store: SessionStore) {
  const sessions = store.list();
  if (sessions.length === 0) {
    console.log('ℹ️  No Auto-Fix sessions found.');
    return;
  }

  console.log(`\n${DIVIDER}`);
  console.log('📋  Governance Auto-Fix Sessions History');
  console.log(DIVIDER);
  for (const s of sessions) {
    console.log(`ID:      ${s.sessionId}`);
    console.log(`Started: ${s.startedAt}`);
    console.log(`Status:  ${s.status}`);
    console.log(`Mode:    ${s.executionMode}`);
    console.log(`Files:   ${s.modifiedFiles.length} modified`);
    console.log(`Branch:  ${s.gitBranch} (${s.gitCommit})`);
    console.log('─'.repeat(40));
  }
}

async function deleteSession(store: SessionStore, sessionId: string) {
  const success = store.delete(sessionId);
  if (success) {
    console.log(`✅ Session ${sessionId} deleted successfully.`);
  } else {
    console.log(`❌ Session ${sessionId} not found.`);
  }
}

async function resumeSession(store: SessionStore, targetSessionId?: string) {
  const rm = new RecoveryManager(workspaceRoot);
  const gitProvider = new ShellGitMetadataProvider(workspaceRoot);
  const currentGit = gitProvider.getMetadata();

  let session = targetSessionId ? store.load(targetSessionId) : rm.detectInterruptedSession();

  if (!session) {
    console.error(
      targetSessionId
        ? `❌ No session found with ID: ${targetSessionId}`
        : '❌ No incomplete/interrupted session found to resume.'
    );
    process.exit(1);
  }

  console.log(`\nFound session ${session.sessionId} in status: ${session.status}`);

  // 1. Verify Repository HEAD State matches
  const gitVerify = rm.verifyRepositoryState(session, currentGit);
  if (!gitVerify.matches) {
    console.warn(`\n⚠️  Repository state has changed since the session started:`);
    console.warn(`   ${gitVerify.reason}`);
    const proceed = await promptConfirm('\nDo you want to continue resuming this session anyway? [Y/n]: ');
    if (!proceed) {
      console.log('🚫 Resuming cancelled by user.');
      process.exit(0);
    }
  }

  // 2. Verify files and rollback backup are still valid
  const allowed = rm.verifyResumeAllowed(session);
  if (!allowed.allowed) {
    console.error(`\n❌ Resuming is not allowed: ${allowed.reason}`);
    process.exit(1);
  }

  console.log('✅ Recovery verification checks passed. Resuming execution...');

  // Call fix.ts resumeSessionExecution directly (no child process overhead)
  await resumeSessionExecution(session.sessionId);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  const store = new SessionStore(workspaceRoot);

  switch (command) {
    case 'list':
      await listSessions(store);
      break;
    case 'delete':
      if (!param) {
        console.error('❌ Please specify a session ID to delete: pnpm governance:session delete <session-id>');
        process.exit(1);
      }
      await deleteSession(store, param);
      break;
    case 'resume':
      await resumeSession(store, param);
      break;
    default:
      console.log(`
Usage: pnpm governance:session <command> [options]

Commands:
  list                 List all session records and their statuses
  resume [session-id]  Resume the specified session (or latest interrupted)
  delete <session-id>  Delete the specified session metadata file
      `);
      process.exit(0);
  }
}

main().catch(err => {
  console.error('💥 Session command failed:', err);
  process.exit(1);
});

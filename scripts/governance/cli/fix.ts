// scripts/governance/cli/fix.ts
import { resolve } from 'path';
import { createInterface } from 'readline';

import { ApprovalPlan } from '../core/approval_plan';
import { AutoFixEngine } from '../core/autofix_engine';
import { ExecutionMode, resolveExecutionMode } from '../core/execution_mode';
import { resolveExecutionPolicy } from '../core/execution_policy';
import { FindingManager } from '../core/finding_manager';
import { FixContext } from '../core/fix_context';
import { FixLifecycleIntegrator } from '../core/fix_lifecycle_integrator';
import { FixRegistry } from '../core/fix_registry';
import { LifecycleManager } from '../core/lifecycle_manager';
import { RecoveryManager } from '../core/recovery_manager';
import { SessionManager } from '../core/session_manager';
import { SessionStore } from '../core/session_store';
import type { VerificationResult } from '../core/verification_result';
import { InteractiveApprovalPolicy } from './interactive_approval_policy';
import { ConsoleInteractionProvider } from './interactive_reporter';

const workspaceRoot = resolve(__dirname, '../../..');

function getArgValue(flag: string): string | undefined {
  const args = process.argv;
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

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

function printVerificationSummary(verResult: VerificationResult) {
  console.log('==================================================');
  console.log('🔍   Governance Post-Execution Verification');
  console.log('==================================================');
  console.log(`Verification Passed:  ${verResult.verificationPassed}`);
  console.log(`Verification Failed:  ${verResult.verificationFailed}`);
  console.log(`Findings Closed:      ${verResult.findingsClosed}`);
  console.log(`Findings Reopened:    ${verResult.findingsReopened}`);
  console.log(`Verification Time:    ${verResult.elapsedMs}ms`);
  console.log('==================================================\n');
}

/**
 * Shared logic to execute the Auto-Fix engine, verify results, and integrate lifecycle updates.
 * Binds signal handlers to enable graceful interruptions.
 */
async function runAutoFix(
  context: FixContext,
  sessionManager: SessionManager,
  abortController: AbortController
): Promise<void> {
  const preview = context.preview;
  const dryRun = context.dryRun;

  // Signal interruption handler
  const handleSignal = () => {
    console.warn('\n⚠️  Interruption signal received. Cleaning up active session safely...');
    abortController.abort();
    sessionManager.interruptSession();
    process.exit(2);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  console.log('🛠️   Initializing Governance Auto-Fix Engine...');
  
  let result;
  try {
    result = await AutoFixEngine.execute(context, sessionManager);
  } catch (err: any) {
    sessionManager.interruptSession();
    throw err;
  } finally {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  }

  const stats = result.stats;

  // Lifecycle integration (skipped in preview / dry-run)
  let verResult: VerificationResult | undefined;
  if (!preview && !dryRun && stats.modifiedFilesCount > 0) {
    try {
      const findingManager = new FindingManager();
      const lifecycleManager = new LifecycleManager(findingManager);
      verResult = await FixLifecycleIntegrator.integrate(result, context, lifecycleManager);
    } catch (err: any) {
      context.logger.error(`Failed to integrate lifecycle updates: ${err.message}`, err);
    }
  }

  // Finalize active session metadata
  sessionManager.completeSession(stats, verResult);

  // Summary output
  console.log('\n==================================================');
  console.log('📊   Governance Auto-Fix Execution Summary');
  console.log('==================================================');
  console.log(`Applied Fixes:      ${stats.applied}`);
  console.log(`Skipped Fixes:      ${stats.skipped}`);
  console.log(`Unsupported Fixes:  ${stats.unsupported}`);
  console.log(`Errors Encountered: ${stats.errors}`);
  console.log(`Modified Files:     ${stats.modifiedFilesCount}`);
  if (stats.modifiedFilesCount > 0) {
    stats.modifiedFiles.forEach(f => console.log(`   - ${f}`));
  }
  console.log(`Execution Time:     ${result.elapsedMs}ms`);
  console.log('==================================================\n');

  if (verResult) {
    printVerificationSummary(verResult);
  }

  if (stats.errors > 0) {
    console.error('❌ Governance Auto-Fix completed with errors.');
    process.exit(1);
  }

  console.log('✅ Governance Auto-Fix completed successfully.');
  process.exit(0);
}

/**
 * Resumes execution of a previously interrupted session ID.
 * Exposed to session.ts to avoid child process execution overhead.
 */
export async function resumeSessionExecution(sessionId: string): Promise<void> {
  const store = new SessionStore(workspaceRoot);
  const session = store.load(sessionId);
  if (!session) {
    throw new Error(`Session metadata not found for ID: ${sessionId}`);
  }

  // Restore the approved violations list to gate execution policy
  const plan = new ApprovalPlan(new Set(session.approvedViolations), 0);
  const executionPolicy = resolveExecutionPolicy({
    interactive: session.interactive,
    safeOnly: session.safeOnly,
    plan,
  });

  const abortController = new AbortController();
  const context = new FixContext({
    workspaceRoot,
    dryRun: session.dryRun,
    preview: session.preview,
    safeOnly: session.safeOnly,
    interactive: session.interactive,
    executionPolicy,
    signal: abortController.signal,
  });

  const sessionManager = new SessionManager(workspaceRoot);
  sessionManager.resumeSession(session);

  await runAutoFix(context, sessionManager, abortController);
}

async function run() {
  const args = process.argv;

  // Rollback redirect
  if (args.includes('--rollback')) {
    console.warn('⚠️  Please execute rollback subcommands via: pnpm governance:rollback <command>');
    process.exit(1);
  }

  // Register default standard fixers
  FixRegistry.registerDefaultFixers();

  // Parse CLI Options
  const dryRun      = args.includes('--dry-run');
  const preview     = args.includes('--preview');
  const safeOnly    = args.includes('--safe-only');
  const rule        = getArgValue('--rule');
  const path        = getArgValue('--path');
  const json        = args.includes('--json');
  const report      = getArgValue('--report');

  const mode = resolveExecutionMode({ rollback: false, interactive: args.includes('--interactive'), preview, dryRun });

  const sessionManager = new SessionManager(workspaceRoot);
  const recoveryManager = new RecoveryManager(workspaceRoot);

  // ── Interruption Recovery Check ──────────────────────────────────────────
  if (process.stdin.isTTY) {
    const interrupted = recoveryManager.detectInterruptedSession();
    if (interrupted) {
      console.log(`\n⚠️  Incomplete Governance session detected: ${interrupted.sessionId}`);
      console.log(`   Started: ${interrupted.startedAt}`);
      console.log(`   Mode:    ${interrupted.executionMode}`);
      const resume = await promptConfirm('\nWould you like to resume this incomplete session? [Y/n]: ');
      if (resume) {
        const check = recoveryManager.verifyResumeAllowed(interrupted);
        if (!check.allowed) {
          console.error(`❌ Cannot resume: ${check.reason}`);
          process.exit(1);
        }
        await resumeSessionExecution(interrupted.sessionId);
        return;
      } else {
        // Mark session as cancelled/abandoned to avoid checking it again
        interrupted.status = 'CANCELLED';
        new SessionStore(workspaceRoot).save(interrupted);
        console.log('ℹ️  Incomplete session abandoned. Initiating fresh execution...\n');
      }
    }
  }

  // ── Start Fresh Session ──────────────────────────────────────────────────
  const abortController = new AbortController();
  const context = new FixContext({
    workspaceRoot,
    dryRun,
    preview,
    safeOnly,
    rule,
    path,
    interactive: mode === ExecutionMode.INTERACTIVE,
    json,
    report,
    signal: abortController.signal,
  });

  let approvalPlan: ApprovalPlan | undefined;
  let approvedList: string[] = [];

  if (mode === ExecutionMode.INTERACTIVE) {
    if (!process.stdin.isTTY) {
      console.log('⚠️  Interactive mode requires a TTY. Running standard governance:fix instead.');
    } else {
      const scanContext = new FixContext({ workspaceRoot, safeOnly, rule, path, preview, dryRun });
      const reporter = new ConsoleInteractionProvider();
      
      const { plan, result: interactiveResult } = await InteractiveApprovalPolicy.gatherApprovals(
        scanContext,
        reporter
      );
      reporter.dispose();

      if (interactiveResult.cancelled) {
        process.exit(2);
      }

      approvalPlan = plan;
      approvedList = plan.entries().map(e => `${e.ruleId}:${e.filePath}`);
      console.log(`\n✅ ${interactiveResult.approvedCount} fix(es) approved. Proceeding with execution...\n`);
    }
  }

  // Resolve the ExecutionPolicy and apply to the final context
  const executionPolicy = resolveExecutionPolicy({
    interactive: !!approvalPlan,
    safeOnly,
    plan: approvalPlan,
  });
  context.executionPolicy = executionPolicy;

  // Initialize session metadata on disk
  await sessionManager.startSession(mode, context, approvedList);

  await runAutoFix(context, sessionManager, abortController);
}

// Only execute standard run when called directly via process.argv
if (require.main === module) {
  run().catch((err) => {
    console.error('💥 CLI encountered a fatal error:', err);
    process.exit(1);
  });
}

import { resolve } from 'path';
import { AutoFixEngine } from '../core/autofix_engine';
import { FixContext } from '../core/fix_context';
import { RollbackManager } from '../core/rollback_manager';

const workspaceRoot = resolve(__dirname, '../../..');

function getArgValue(flag: string): string | undefined {
  const args = process.argv;
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

async function run() {
  const args = process.argv;

  // 1. Rollback Mode check
  if (args.includes('--rollback')) {
    console.log('🔄 Executing rollback to restore latest backed-up file states...');
    try {
      const rollbackResult = RollbackManager.rollbackLatest(workspaceRoot);
      if (rollbackResult.success) {
        console.log(`✅ Rollback completed successfully. Restored files:`);
        rollbackResult.filesRestored.forEach(f => console.log(`   - ${f}`));
        process.exit(0);
      } else {
        console.log('⚠️  No active rollback backups found to restore.');
        process.exit(0);
      }
    } catch (err: any) {
      console.error(`❌ Rollback failed: ${err.message}`);
      process.exit(1);
    }
  }

  // 2. Parse CLI Options
  const dryRun = args.includes('--dry-run');
  const preview = args.includes('--preview');
  const safeOnly = args.includes('--safe-only');
  const rule = getArgValue('--rule');
  const path = getArgValue('--path');

  // Stub flags for future CLI enhancements (PR9B-E)
  const interactive = args.includes('--interactive');
  const json = args.includes('--json');
  const report = getArgValue('--report');

  const context = new FixContext({
    workspaceRoot,
    dryRun,
    preview,
    safeOnly,
    rule,
    path,
    interactive,
    json,
    report,
  });

  console.log('🛠️   Initializing Governance Auto-Fix Engine...');
  const result = await AutoFixEngine.execute(context);
  const stats = result.stats;

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

  if (stats.errors > 0) {
    console.error('❌ Governance Auto-Fix completed with errors.');
    process.exit(1);
  }

  console.log('✅ Governance Auto-Fix completed successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('💥 CLI encountered a fatal error:', err);
  process.exit(1);
});

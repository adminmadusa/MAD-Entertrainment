import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';

export class BaselineCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'baseline',
    name: 'baseline',
    category: 'release',
    description: 'Synchronizes and compares repository files baseline metadata.',
    examples: ['baseline', 'baseline --sync'],
    aliases: ['base-hash'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const hasSyncFlag = args.includes('--sync');
    context.logger.info('Auditing baseline metadata integrity...');

    // 1. Compare hashes
    const comparisons = await context.services.baseline.compare();
    const mismatches = comparisons.filter(c => c.status !== 'ok').map(c => `${c.path} (${c.status})`);

    let syncedFiles: string[] = [];
    if (hasSyncFlag) {
      context.logger.info('Syncing baseline checksum hashes...');
      syncedFiles = await context.services.baseline.sync(context.dryRun);
    } else {
      if (mismatches.length > 0) {
        context.logger.warn(`Detected ${mismatches.length} file modifications/additions against baseline:`);
        for (const m of mismatches) {
          context.logger.warn(`  - ${m}`);
        }
        context.logger.info('Run governance baseline --sync to synchronize baseline states.');
      } else {
        context.logger.info('Baseline integrity verification passed cleanly.');
      }
    }

    return {
      type: 'baseline',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        syncedFiles,
        mismatches,
        status: mismatches.length > 0 ? 'sync_required' : 'ok',
      },
    };
  }
}

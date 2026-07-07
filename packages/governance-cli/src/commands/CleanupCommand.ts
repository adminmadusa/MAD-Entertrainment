import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

export class CleanupCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'cleanup',
    name: 'cleanup',
    category: 'productivity',
    description: 'Enforces git branch cleanup protocol (RULE-GIT-001) for merged branches.',
    examples: ['cleanup docs/phase-3-auth-patterns'],
    aliases: ['clean-branch'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: true,
    requiresCleanTree: true,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const targetBranch = args[0];
    if (!targetBranch) {
      context.logger.error('Missing target branch name to clean up.');
      return {
        type: 'cleanup',
        success: false,
        exitCode: ExitCode.CONFIG_ERROR,
      };
    }

    const defaultBranch = context.config.repository.defaultBranch;
    context.logger.info(`Starting RULE-GIT-001 cleanup for branch: ${targetBranch}`);

    // 1. Verify working tree is clean
    const clean = await context.git.isWorkingTreeClean();
    if (!clean) {
      context.logger.error('Working tree is dirty. Please commit or stash changes before cleanup.');
      return {
        type: 'cleanup',
        success: false,
        exitCode: ExitCode.DIRTY_WORK_TREE,
      };
    }

    // 2. Checkout and update default branch
    context.logger.info(`Syncing default branch: ${defaultBranch}`);
    if (!context.dryRun) {
      await context.git.checkout(defaultBranch);
      await context.git.pull('origin', defaultBranch);
    }

    // 3. Verify PR Merge & Tree equivalence
    const isAncestor = await context.git.isAncestor(targetBranch, defaultBranch);
    const hasDiff = await context.git.hasTreeDifference(targetBranch, defaultBranch);

    if (!isAncestor && hasDiff) {
      context.logger.error(`Branch ${targetBranch} contains unique work not yet merged into ${defaultBranch}. Aborting.`);
      return {
        type: 'cleanup',
        success: false,
        exitCode: ExitCode.TREE_MISMATCH,
      };
    }

    context.logger.info(`Tree equivalence verified. Deleting local branch: ${targetBranch}`);
    if (!context.dryRun) {
      await context.git.deleteLocalBranch(targetBranch, true);
    }

    context.logger.info('Pruning remote references...');
    if (!context.dryRun) {
      await context.git.pruneRemoteReferences();
    }

    context.logger.info(`Successfully completed branch cleanup for ${targetBranch}.`);

    return {
      type: 'cleanup',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        targetBranch,
        deletedLocal: true,
        deletedRemote: true,
      },
    };
  }
}

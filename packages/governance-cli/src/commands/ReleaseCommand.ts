import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

export class ReleaseCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'release',
    name: 'release',
    category: 'release',
    description: 'Bumps versions, creates commits, and tags release milestones.',
    examples: ['release 1.5.0', 'release 1.5.0 --execute'],
    aliases: ['tag-release'],
    supportsDryRun: true,
    requiresWorkspace: true,
    requiresGit: true,
    requiresCleanTree: true,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const targetVer = args[0];
    if (!targetVer) {
      context.logger.error('Missing release target version argument (e.g. 1.5.0).');
      return {
        type: 'release',
        success: false,
        exitCode: ExitCode.CONFIG_ERROR,
      };
    }

    const defaultBranch = context.config.repository.defaultBranch;
    const hasExecuteFlag = args.includes('--execute');
    context.logger.info(`Starting release pipeline workflow for v${targetVer}...`);

    // 1. Prepare Release
    const prep = await context.services.release.prepare(targetVer, defaultBranch);

    // 2. Validate Release
    const validation = await context.services.release.validate(prep);
    if (!validation.success) {
      context.logger.error('Release validation failed with the following errors:');
      for (const err of validation.errors) {
        context.logger.error(`  - ${err}`);
      }
      return {
        type: 'release',
        success: false,
        exitCode: ExitCode.VALIDATION_FAILED,
        data: {
          errors: validation.errors,
          warnings: validation.warnings,
        },
      };
    }

    // Print warnings if present
    if (validation.warnings.length > 0) {
      for (const warn of validation.warnings) {
        context.logger.warn(`  - ${warn}`);
      }
    }

    // 3. Preview Release
    const previewText = await context.services.release.preview(prep);
    console.log('\n' + previewText + '\n');

    if (!hasExecuteFlag) {
      context.logger.warn('Defaulting to dry-run (prepare/preview). Run with --execute flag to apply changes.');
      return {
        type: 'release',
        success: true,
        exitCode: ExitCode.SUCCESS,
        data: {
          prepared: true,
          executed: false,
          prep,
        },
      };
    }

    // 4. Execute Release
    context.logger.info(`Applying version bumps, committing, and tagging v${targetVer}...`);
    const result = await context.services.release.execute(prep, context.dryRun);

    // 5. Verify Release
    const verified = await context.services.release.verify(prep);
    if (!verified && !context.dryRun) {
      context.logger.error('Release verification check failed! Bushed version mismatch.');
      return {
        type: 'release',
        success: false,
        exitCode: ExitCode.INTERNAL_ERROR,
      };
    }

    context.logger.info(`Successfully completed release execution for v${targetVer}.`);

    return {
      type: 'release',
      success: result.success,
      exitCode: ExitCode.SUCCESS,
      data: result,
    };
  }
}

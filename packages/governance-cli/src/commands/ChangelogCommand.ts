import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { join } from 'path';

export class ChangelogCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'changelog',
    name: 'changelog',
    category: 'release',
    description: 'Generates a release changelog based on commit prefixes.',
    examples: ['changelog', 'changelog --from v1.4.0'],
    aliases: ['change-notes'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: true,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const defaultBranch = context.config.repository.defaultBranch;
    
    // Find --from flag if specified
    const fromIdx = args.indexOf('--from');
    const fromRef = fromIdx !== -1 && args[fromIdx + 1] ? args[fromIdx + 1] : defaultBranch;
    
    context.logger.info(`Extracting changes notes starting from reference: ${fromRef}`);
    const changelogText = await context.services.changelog.generate(fromRef, 'HEAD');

    const changelogPath = join(context.repoRoot, 'CHANGELOG.md');
    if (!context.dryRun) {
      // Append to local CHANGELOG.md or create one
      let existing = '';
      if (await context.fs.exists(changelogPath)) {
        existing = await context.fs.read(changelogPath);
      }
      const updated = `# Changelog\n\n## Release vDraft (${new Date().toLocaleDateString()})\n\n${changelogText}\n\n${existing}`;
      await context.fs.write(changelogPath, updated);
      context.logger.info(`Appended release changelog notes to ${changelogPath}`);
    }

    return {
      type: 'changelog',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        changelogText,
        outputPath: changelogPath,
      },
    };
  }
}

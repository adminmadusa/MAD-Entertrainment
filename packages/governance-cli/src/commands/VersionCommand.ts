import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

export class VersionCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'version',
    name: 'version',
    category: 'core',
    description: 'Displays the current version of the Governance CLI platform.',
    examples: ['version'],
    aliases: ['v', '--version', '-v'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(_context: ExecutionContext, _args: string[]): Promise<OutputModel> {
    return {
      type: 'version',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        version: '0.1.0-alpha',
      },
    };
  }
}

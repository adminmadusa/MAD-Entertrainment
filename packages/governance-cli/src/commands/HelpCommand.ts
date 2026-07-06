import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { CommandRegistry } from '../core/command';

export class HelpCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'help',
    name: 'help',
    category: 'core',
    description: 'Lists all available governance CLI commands with usage examples.',
    examples: ['help'],
    aliases: ['h', '--help', '-h'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  constructor(private registry: CommandRegistry) {
    super();
  }

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const commandsMetadata = this.registry.getAllUnique().map(c => c.metadata);
    return {
      type: 'help',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        commands: commandsMetadata,
      },
    };
  }
}

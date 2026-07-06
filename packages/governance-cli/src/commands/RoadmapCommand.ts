import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { RoadmapResult } from '../models/RoadmapResult';

export class RoadmapCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'roadmap',
    name: 'roadmap',
    category: 'productivity',
    description: 'Displays colorized sprint phases and monorepo milestones.',
    examples: ['roadmap'],
    aliases: ['map'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel<RoadmapResult>> {
    context.logger.info('Loading workspace milestone roadmaps...');
    try {
      const phases = await context.services.roadmap.loadRoadmap();

      return {
        type: 'roadmap',
        success: true,
        exitCode: ExitCode.SUCCESS,
        data: {
          phases,
        },
      };
    } catch (e: any) {
      context.logger.error(e.message);
      return {
        type: 'roadmap',
        success: false,
        exitCode: ExitCode.CONFIG_ERROR,
      };
    }
  }
}

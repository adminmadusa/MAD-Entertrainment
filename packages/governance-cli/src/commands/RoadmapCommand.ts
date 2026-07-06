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
    const phases = await context.services.roadmap.loadRoadmap();

    return {
      type: 'roadmap',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        phases,
      },
    };
  }
}

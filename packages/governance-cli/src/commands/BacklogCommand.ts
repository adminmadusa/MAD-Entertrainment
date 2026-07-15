import { join } from 'path';

import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

interface BacklogItem {
  id: string;
  title: string;
  priority: string;
  status: string;
}

export class BacklogCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'backlog',
    name: 'backlog',
    category: 'productivity',
    description: 'Lists active design system and UX pattern capability gaps.',
    examples: ['backlog'],
    aliases: ['list-gaps'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const backlogConfigPath = context.config.documentation.backlog;
    const backlogMdPath = join(context.repoRoot, backlogConfigPath);
    const backlogJsonPath = backlogMdPath.replace(/\.md$/, '.json');

    context.logger.info('Querying active backlog registry gaps...');
    const gaps: BacklogItem[] = [];

    // 1. Try JSON database first
    const jsonExists = await context.fs.exists(jsonOutputPath(backlogJsonPath));
    if (jsonExists) {
      try {
        const content = await context.fs.read(backlogJsonPath);
        const data = JSON.parse(content);
        if (Array.isArray(data.items)) {
          gaps.push(...data.items);
        }
      } catch (e: any) {
        context.logger.warn(`Failed to parse backlog JSON: ${e.message}. Falling back to Markdown.`);
      }
    }

    // 2. Compatibility Markdown Fallback Parser
    if (gaps.length === 0) {
      const mdExists = await context.fs.exists(backlogMdPath);
      if (mdExists) {
        const content = await context.fs.read(backlogMdPath);
        // Extract rows from markdown table: | ID | Title | Raised In | Priority | Status | Resolved In |
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/\|\s*(BL-\d+)\s*\|\s*([^|]+)\|\s*[^|]+\|\s*([^|]+)\|\s*([^|]+)\|/);
          if (match) {
            gaps.push({
              id: match[1].trim(),
              title: match[2].trim().replace(/`/g, ''),
              priority: match[3].trim(),
              status: match[4].trim(),
            });
          }
        }
      } else {
        context.logger.warn(`Backlog registry file not found at ${backlogMdPath}`);
      }
    }

    // Sort by priority (high first, then medium, then low)
    const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
    gaps.sort((a, b) => {
      const wA = priorityWeights[a.priority.toLowerCase()] ?? 0;
      const wB = priorityWeights[b.priority.toLowerCase()] ?? 0;
      return wB - wA;
    });

    return {
      type: 'backlog',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        gaps,
      },
    };
  }
}

function jsonOutputPath(path: string): string {
  return path;
}

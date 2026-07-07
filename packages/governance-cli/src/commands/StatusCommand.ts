import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { execSync } from 'child_process';
import { join } from 'path';
import { readdirSync } from 'fs';

export class StatusCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'status',
    name: 'status',
    category: 'core',
    description: 'Displays a dashboard overview of repository and governance status.',
    examples: ['status'],
    aliases: ['st'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    context.logger.info('Gathering repository status metrics...');

    const branch = await context.git.getCurrentBranch();
    const clean = await context.git.isWorkingTreeClean();

    // Query versions
    const nodeVersion = process.version;
    let pnpmVersion = 'unknown';
    try {
      pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    } catch {}

    // Count patterns
    let patternsCount = 0;
    try {
      const patternsDir = join(context.repoRoot, 'docs/design-system/patterns');
      const files = readdirSync(patternsDir);
      patternsCount = files.filter(f => f.endsWith('.md') && !f.startsWith('_')).length;
    } catch {}

    // Count backlog items
    let backlogCount = 0;
    try {
      const backlogFile = join(context.repoRoot, context.config.documentation.backlog);
      const exists = await context.fs.exists(backlogFile);
      if (exists) {
        const content = await context.fs.read(backlogFile);
        // Simple regex matching markdown table rows for BL-XXX
        const matches = content.match(/\|\s*BL-\d+\s*\|/g);
        backlogCount = matches ? matches.length : 0;
      }
    } catch {}

    const data = {
      branch,
      isClean: clean,
      defaultBranch: context.config.repository.defaultBranch,
      nodeVersion,
      pnpmVersion,
      patternsCount,
      backlogCount,
      repoRoot: context.repoRoot,
      governanceCliVersion: '0.1.0-alpha',
    };

    return {
      type: 'status',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data,
    };
  }
}

import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { join } from 'path';

export class PRCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'pr',
    name: 'pr',
    category: 'productivity',
    description: 'Assembles a pull request description mapping changed files and plans.',
    examples: ['pr'],
    aliases: ['generate-pr'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: true,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const defaultBranch = context.config.repository.defaultBranch;
    const branchName = await context.git.getCurrentBranch();

    context.logger.info('Assembling PR description details...');

    // 1. Load implementation plan details if present
    let planSummary = 'No implementation plan details found.';
    const planRootPath = join(context.repoRoot, 'implementation_plan.md');
    const planBrainPath = join('/Users/admin/.gemini/antigravity-ide/brain/a6a7cf4f-2535-442b-b93d-b011211a7814/implementation_plan.md');
    
    let planExists = await context.fs.exists(planRootPath);
    let activePlanPath = planRootPath;
    if (!planExists) {
      planExists = await context.fs.exists(planBrainPath);
      activePlanPath = planBrainPath;
    }

    if (planExists) {
      const planContent = await context.fs.read(activePlanPath);
      // Extract top header description block
      const paragraphs = planContent.split('\n\n');
      const intro = paragraphs.find(p => p.trim() && !p.startsWith('#') && !p.startsWith('---'));
      if (intro) {
        planSummary = intro.trim();
      }
    }

    // 2. Load walkthrough details if present
    let walkthroughSummary = 'No walkthrough logs found.';
    const safeBranch = branchName.replace(/[^a-zA-Z0-9]/g, '-');
    const walkthroughPath = join(context.repoRoot, 'docs/walkthroughs', `walkthrough-${safeBranch}.md`);
    const walkthroughExists = await context.fs.exists(walkthroughPath);

    if (walkthroughExists) {
      const walkthroughContent = await context.fs.read(walkthroughPath);
      // Extract files section
      const sections = walkthroughContent.split('## ');
      const filesSection = sections.find(s => s.startsWith('Changed Files'));
      if (filesSection) {
        walkthroughSummary = '### Changed Files\n' + filesSection.replace('Changed Files', '').trim();
      }
    }

    // 3. Load commits list via GitService
    const commits = await context.git.getCommitMessages(defaultBranch);
    const commitsListMd = commits.map(c => `- ${c}`).join('\n');

    // Assemble PR
    const prTitle = `feat(${branchName.split('/')[0]}): progress on ${branchName}`;
    const prBody = `
# PR: ${branchName}

## Description
${planSummary}

## Changes Log
${walkthroughSummary}

## Commit History
${commits ? commitsListMd : '- No commits on current task branch'}

## Quality Gate Verification
- [ ] Is there a single source of truth?
- [ ] Did we avoid duplicate validation/logic?
- [ ] Are frontend and backend contracts aligned?
- [ ] Did we clean up the branch usingRULE-GIT-001?
`;

    const prOutputPath = join(context.repoRoot, 'docs/pull-requests', `pr-${safeBranch}.md`);

    context.logger.info(`Writing PR template description to ${prOutputPath}`);
    if (!context.dryRun) {
      await context.fs.write(prOutputPath, prBody.trim());
    }

    return {
      type: 'pr',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        title: prTitle,
        description: prBody.trim(),
        outputFilePath: prOutputPath,
      },
    };
  }
}

import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';
import { ExitCode } from '../config/schema';
import { join } from 'path';

export class InitCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'init',
    name: 'init',
    category: 'core',
    description: 'Bootstraps the governance configuration file and template directories in the repository.',
    examples: ['init'],
    aliases: ['setup'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const configPath = join(context.repoRoot, 'governance.config.ts');
    let createdConfig = false;
    let createdTemplates = false;

    context.logger.info('Initializing governance CLI configuration...');

    // 1. Check/create config file
    const configExists = await context.fs.exists(configPath);
    if (!configExists) {
      if (!context.dryRun) {
        const defaultConfigContent = `import { GovernanceConfig } from '@esparex/governance-cli';

const config: GovernanceConfig = {
  version: 1,
  repository: {
    defaultBranch: 'develop',
    packageManager: 'pnpm',
  },
  documentation: {
    backlog: 'docs/design-system/backlog/BACKLOG.md',
    roadmap: 'ROADMAP.md',
    root: 'docs/',
  },
  pullRequests: {
    template: '.github/pull_request_template.md',
    targetPath: 'docs/pull-requests/',
  },
  branches: {
    cleanupRule: 'RULE-GIT-001',
  },
  plugins: [],
  exitCodes: {
    SUCCESS: 0,
    DIRTY_WORK_TREE: 10,
    BUILD_FAILED: 11,
    TESTS_FAILED: 12,
    BRANCH_NOT_MERGED: 20,
    TREE_MISMATCH: 21,
    MISSING_DOCUMENTATION: 30,
    VALIDATION_FAILED: 40,
    CONFIG_ERROR: 50,
    INTERNAL_ERROR: 60,
  }
};

export default config;
`;
        await context.fs.write(configPath, defaultConfigContent);
      }
      createdConfig = true;
      context.logger.info(`Scaffolded default configuration at ${configPath}`);
    } else {
      context.logger.info(`Governance configuration already exists at ${configPath}`);
    }

    // 2. Scaffold templates path
    const templatesDir = join(context.repoRoot, 'docs/governance/templates/v1');
    const templatesExists = await context.fs.exists(templatesDir);
    if (!templatesExists) {
      if (!context.dryRun) {
        await context.fs.mkdir(templatesDir);
      }
      createdTemplates = true;
      context.logger.info(`Created templates directory at ${templatesDir}`);
    }

    return {
      type: 'init',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        createdConfig,
        createdTemplates,
      },
    };
  }
}

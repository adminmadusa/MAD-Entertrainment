#!/usr/bin/env node

import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';
import { getDefaults, ExitCode, GovernanceConfig } from './config/schema';
import { ExecutionContext } from './core/context';
import { CommandRegistry } from './core/command';
import { PluginBuilder } from './core/plugin';
import { ConsoleLogger } from './services/Logger';
import { GitCliService } from './services/GitService';
import { LocalRepositoryService } from './services/RepositoryService';
import { NodeFileSystemService } from './services/FileSystemService';
import { ConsoleRenderer } from './renderers/ConsoleRenderer';
import { JsonRenderer } from './renderers/JsonRenderer';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { Renderer } from './renderers/Renderer';

// Core commands
import { HelpCommand } from './commands/HelpCommand';
import { VersionCommand } from './commands/VersionCommand';
import { InitCommand } from './commands/InitCommand';
import { DoctorCommand } from './commands/DoctorCommand';
import { StatusCommand } from './commands/StatusCommand';
import { CleanupCommand } from './commands/CleanupCommand';
import { WalkthroughCommand } from './commands/WalkthroughCommand';
import { PRCommand } from './commands/PRCommand';
import { BacklogCommand } from './commands/BacklogCommand';
import { RoadmapCommand } from './commands/RoadmapCommand';
import { ChangelogCommand } from './commands/ChangelogCommand';
import { ReleaseCommand } from './commands/ReleaseCommand';
import { BaselineCommand } from './commands/BaselineCommand';

// Import build service container
import { buildServiceContainer } from './services/container';

async function main() {
  let repoRoot = resolve(process.cwd());
  while (repoRoot !== dirname(repoRoot)) {
    if (existsSync(join(repoRoot, 'pnpm-workspace.yaml')) || existsSync(join(repoRoot, '.git'))) {
      break;
    }
    repoRoot = dirname(repoRoot);
  }

  // 1. Startup Lifecycle: Load Configuration
  const config: GovernanceConfig = getDefaults();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonMode = args.includes('--json');
  const mdMode = args.includes('--markdown');

  // Filter flags from arguments passed to commands
  const cleanArgs = args.filter(
    arg => !['--dry-run', '--verbose', '-v', '--json', '--markdown'].includes(arg)
  );

  // 2. Setup Services & Logging
  const logger = new ConsoleLogger(verbose);
  const git = new GitCliService(repoRoot);
  const repository = new LocalRepositoryService(repoRoot);
  const fs = new NodeFileSystemService();

  // Setup Renderer
  let renderer: Renderer = new ConsoleRenderer();
  if (jsonMode) {
    renderer = new JsonRenderer();
  } else if (mdMode) {
    renderer = new MarkdownRenderer();
  }

  // Instantiate domain services container using factory assembler
  const services = buildServiceContainer(fs, git, repoRoot, config);

  // 3. Build Registry
  const registry = new CommandRegistry();

  // Plugin builder interface implementation
  const builder: PluginBuilder = {
    registerCommand(command) {
      registry.register(command);
    },
    registerRenderer(customRenderer) {
      renderer = customRenderer;
    },
  };

  // Register Core & Productivity commands
  builder.registerCommand(new HelpCommand());
  builder.registerCommand(new VersionCommand());
  builder.registerCommand(new InitCommand());
  builder.registerCommand(new DoctorCommand());
  builder.registerCommand(new StatusCommand());
  builder.registerCommand(new CleanupCommand());
  builder.registerCommand(new WalkthroughCommand());
  builder.registerCommand(new PRCommand());
  builder.registerCommand(new BacklogCommand());
  builder.registerCommand(new RoadmapCommand());
  builder.registerCommand(new ChangelogCommand());
  builder.registerCommand(new ReleaseCommand());
  builder.registerCommand(new BaselineCommand());

  // Load configured plugins (stub for 3.6A core)
  for (const plugin of config.plugins) {
    logger.debug(`Registering plugin: ${plugin.name} (${plugin.id})`);
    plugin.register(builder);
  }

  // Match command
  const commandName = cleanArgs[0] || 'help';
  const targetCommand = registry.get(commandName);

  if (!targetCommand) {
    logger.error(`Unknown command: ${commandName}`);
    logger.info("Run 'governance --help' to see list of valid commands.");
    process.exit(ExitCode.CONFIG_ERROR);
  }

  // 4. Validate preconditions
  const meta = targetCommand.metadata;

  if (meta.requiresGit) {
    const isGit = await repository.getRoot().then(() => true).catch(() => false);
    if (!isGit) {
      logger.error(`Command ${meta.name} requires Git capability.`);
      process.exit(ExitCode.CONFIG_ERROR);
    }
  }

  if (meta.requiresWorkspace) {
    const hasWorkspace = await repository.hasWorkspace();
    if (!hasWorkspace) {
      logger.error(`Command ${meta.name} requires monorepo workspace.`);
      process.exit(ExitCode.CONFIG_ERROR);
    }
  }

  if (meta.requiresCleanTree) {
    const clean = await git.isWorkingTreeClean();
    if (!clean) {
      logger.error('Working tree is dirty. Please stash or commit changes first.');
      process.exit(ExitCode.DIRTY_WORK_TREE);
    }
  }

  // 5. Execution context instantiation
  const context: ExecutionContext = {
    config,
    repoRoot,
    git,
    repository,
    fs,
    logger,
    renderer,
    registry,
    services,
    dryRun,
    verbose,
  };

  try {
    logger.debug(`Executing command: ${meta.name} (ID: ${meta.id})`);
    if (dryRun && !meta.supportsDryRun) {
      logger.warn(`Command ${meta.name} does not support --dry-run. Executing normally...`);
    }

    const outputModel = await targetCommand.execute(context, cleanArgs.slice(1));

    // Render results
    await renderer.render(outputModel);

    process.exit(outputModel.exitCode);
  } catch (error: any) {
    logger.error('Execution encountered unexpected failure:', error);
    process.exit(ExitCode.INTERNAL_ERROR);
  }
}

main().catch(err => {
  console.error('Fatal engine crash:', err);
  process.exit(ExitCode.INTERNAL_ERROR);
});

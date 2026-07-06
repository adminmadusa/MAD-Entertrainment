import { GovernanceConfig } from '../config/schema';
import { GitService } from '../services/GitService';
import { RepositoryService } from '../services/RepositoryService';
import { FileSystemService } from '../services/FileSystemService';
import { Logger } from '../services/Logger';
import { Renderer } from '../renderers/Renderer';
import { CommandRegistry } from './command';

export interface ExecutionContext {
  config: GovernanceConfig;
  repoRoot: string;
  git: GitService;
  repository: RepositoryService;
  fs: FileSystemService;
  logger: Logger;
  renderer: Renderer;
  registry: CommandRegistry;
  dryRun: boolean;
  verbose: boolean;
}

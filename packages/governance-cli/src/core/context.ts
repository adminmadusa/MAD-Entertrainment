import { GovernanceConfig } from '../config/schema';
import { GitService } from '../services/GitService';
import { RepositoryService } from '../services/RepositoryService';
import { FileSystemService } from '../services/FileSystemService';
import { Logger } from '../services/Logger';
import { Renderer } from '../renderers/Renderer';
import { CommandRegistry } from './command';

// Import domain services
import { ReleaseService } from '../services/release/ReleaseService';
import { VersionService } from '../services/release/VersionService';
import { ChangelogService } from '../services/release/ChangelogService';
import { BaselineService } from '../services/baseline/BaselineService';
import { RoadmapService } from '../services/roadmap/RoadmapService';
import { TemplateService } from '../services/templates/TemplateService';
import { GitTagService } from '../services/git/GitTagService';

export interface ServiceContainer {
  release: ReleaseService;
  version: VersionService;
  changelog: ChangelogService;
  baseline: BaselineService;
  roadmap: RoadmapService;
  template: TemplateService;
  tag: GitTagService;
}

export interface ExecutionContext {
  config: GovernanceConfig;
  repoRoot: string;
  git: GitService;
  repository: RepositoryService;
  fs: FileSystemService;
  logger: Logger;
  renderer: Renderer;
  registry: CommandRegistry;
  services: ServiceContainer;
  dryRun: boolean;
  verbose: boolean;
}

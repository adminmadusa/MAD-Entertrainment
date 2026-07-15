import { GovernanceConfig } from '../config/schema';
import { Renderer } from '../renderers/Renderer';
import { BaselineService } from '../services/baseline/BaselineService';
import { FileSystemService } from '../services/FileSystemService';
import { GitTagService } from '../services/git/GitTagService';
import { GitService } from '../services/GitService';
import { Logger } from '../services/Logger';
import { ChangelogService } from '../services/release/ChangelogService';
import { ReleaseService } from '../services/release/ReleaseService';
import { VersionService } from '../services/release/VersionService';
import { RepositoryService } from '../services/RepositoryService';
import { RoadmapService } from '../services/roadmap/RoadmapService';
import { TemplateService } from '../services/templates/TemplateService';
import { CommandRegistry } from './command';

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

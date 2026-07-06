import { FileSystemService } from './FileSystemService';
import { GitService } from './GitService';
import { GovernanceConfig } from '../config/schema';
import { ServiceContainer } from '../core/context';

// Import domain services
import { TemplateService } from './templates/TemplateService';
import { ChangelogService } from './release/ChangelogService';
import { VersionService } from './release/VersionService';
import { ReleaseService } from './release/ReleaseService';
import { BaselineService } from './baseline/BaselineService';
import { RoadmapService } from './roadmap/RoadmapService';
import { GitTagService } from './git/GitTagService';

// Import providers and adapters
import { GitCommitProvider } from '../providers/changelog/GitCommitProvider';
import { PnpmRepositoryAdapter } from '../adapters/repository/PnpmRepositoryAdapter';

export function buildServiceContainer(
  fs: FileSystemService,
  git: GitService,
  repoRoot: string,
  config: GovernanceConfig
): ServiceContainer {
  const commitProvider = new GitCommitProvider(git);
  const repoAdapter = new PnpmRepositoryAdapter(repoRoot);

  const tagService = new GitTagService(git);
  const templateService = new TemplateService(fs);
  const changelogService = new ChangelogService(commitProvider);
  const versionService = new VersionService(repoAdapter);
  const releaseService = new ReleaseService(git, tagService, changelogService, versionService);
  const baselineService = new BaselineService(fs, repoRoot, config.documentation.root);
  const roadmapService = new RoadmapService(fs, repoRoot, config.documentation.roadmap);

  return {
    release: releaseService,
    version: versionService,
    changelog: changelogService,
    baseline: baselineService,
    roadmap: roadmapService,
    template: templateService,
    tag: tagService,
  };
}

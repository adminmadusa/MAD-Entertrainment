import { ReleasePreparation } from '../../models/ReleasePreparation';
import { ReleaseResult } from '../../models/ReleaseResult';
import { GitTagService } from '../git/GitTagService';
import { GitService } from '../GitService';
import { ChangelogService } from './ChangelogService';
import { VersionService } from './VersionService';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class ReleaseService {
  constructor(
    private git: GitService,
    private tagService: GitTagService,
    private changelogService: ChangelogService,
    private versionService: VersionService
  ) {}

  async prepare(version: string, defaultBranch: string): Promise<ReleasePreparation> {
    const currentVersion = await this.versionService.getCurrentVersion();
    const commits = await this.git.getCommitMessages(defaultBranch);

    // Generate release notes
    const changelog = await this.changelogService.generate(defaultBranch, 'HEAD');
    const changedPackages = await this.versionService.getWorkspacePackages();

    const warnings: string[] = [];
    if (commits.length === 0) {
      warnings.push('No commit diffs detected on current branch relative to default base.');
    }

    return {
      version,
      currentVersion,
      changelog,
      changedPackages,
      tagsToCreate: [`v${version}`],
      commits,
      warnings,
    };
  }

  async validate(prep: ReleasePreparation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [...prep.warnings];

    // Check version formats
    if (!this.versionService.validate(prep.version)) {
      errors.push(`Target version format is invalid SemVer: ${prep.version}`);
    }

    // Check clean working tree
    const clean = await this.git.isWorkingTreeClean();
    if (!clean) {
      errors.push('Working tree is dirty. Stash or commit modifications before release.');
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  async preview(prep: ReleasePreparation): Promise<string> {
    return `
--- RELEASE PREVIEW ---
Bumping Version: ${prep.currentVersion} ➔ ${prep.version}
Tags to Create:  ${prep.tagsToCreate.join(', ')}
Packages affected: ${prep.changedPackages.join(', ')}

--- GENERATED CHANGELOG ---
${prep.changelog}
-----------------------
`.trim();
  }

  async execute(prep: ReleasePreparation, dryRun: boolean): Promise<ReleaseResult> {
    const bumpedPackages = await this.versionService.bump(prep.version, dryRun);

    if (!dryRun) {
      // Commit version bump changes
      await this.git.commit(`chore(release): release v${prep.version}`);

      // Tag commits
      for (const tag of prep.tagsToCreate) {
        await this.tagService.createTag(tag, `Release version ${prep.version}`, false);
      }
    }

    return {
      version: prep.version,
      success: true,
      tagsCreated: prep.tagsToCreate,
      bumpedPackages,
    };
  }

  async verify(prep: ReleasePreparation): Promise<boolean> {
    // Simple integrity check, verifying version exists in package.json
    const activeVer = await this.versionService.getCurrentVersion();
    return activeVer === prep.version;
  }
}

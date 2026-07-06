import { Command } from '../core/command';
import { Renderer } from '../renderers/Renderer';

export enum ExitCode {
  SUCCESS = 0,

  // Precondition Failures (10-19)
  DIRTY_WORK_TREE = 10,
  BUILD_FAILED = 11,
  TESTS_FAILED = 12,

  // Git Failures (20-29)
  BRANCH_NOT_MERGED = 20,
  TREE_MISMATCH = 21,

  // Documentation Failures (30-39)
  MISSING_DOCUMENTATION = 30,

  // Validation Failures (40-49)
  VALIDATION_FAILED = 40,

  // Configuration Failures (50-59)
  CONFIG_ERROR = 50,

  // Internal CLI Failures (60-69)
  INTERNAL_ERROR = 60,
}

export interface PluginBuilder {
  registerCommand(command: Command): void;
  registerRenderer(renderer: Renderer): void;
}

export interface GovernancePlugin {
  id: string;
  name: string;
  version: string;
  register(builder: PluginBuilder): void;
}

export interface RepositoryConfig {
  defaultBranch: string;
  packageManager: string;
}

export interface DocumentationConfig {
  backlog: string;
  roadmap: string;
  root: string;
}

export interface PullRequestConfig {
  template: string;
  targetPath: string;
}

export interface BranchConfig {
  cleanupRule: string;
}

export interface GovernanceConfig {
  version: number;
  repository: RepositoryConfig;
  documentation: DocumentationConfig;
  pullRequests: PullRequestConfig;
  branches: BranchConfig;
  plugins: GovernancePlugin[];
}

export const getDefaults = (): GovernanceConfig => ({
  version: 1,
  repository: {
    defaultBranch: process.env.GOVERNANCE_DEFAULT_BRANCH ?? 'develop',
    packageManager: process.env.GOVERNANCE_PACKAGE_MANAGER ?? 'pnpm',
  },
  documentation: {
    backlog: process.env.GOVERNANCE_BACKLOG_PATH ?? 'docs/design-system/backlog/BACKLOG.md',
    roadmap: process.env.GOVERNANCE_ROADMAP_PATH ?? 'ROADMAP.md',
    root: process.env.GOVERNANCE_DOCS_ROOT ?? 'docs/',
  },
  pullRequests: {
    template: process.env.GOVERNANCE_PR_TEMPLATE ?? '.github/pull_request_template.md',
    targetPath: process.env.GOVERNANCE_PR_TARGET_PATH ?? 'docs/pull-requests/',
  },
  branches: {
    cleanupRule: process.env.GOVERNANCE_CLEANUP_RULE ?? 'RULE-GIT-001',
  },
  plugins: [],
});

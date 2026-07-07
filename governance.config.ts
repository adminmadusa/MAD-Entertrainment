import { GovernanceConfig } from '@esparex/governance-cli';

const config: GovernanceConfig = {
  version: 1,
  repository: {
    defaultBranch: 'develop',
    packageManager: 'pnpm',
  },
  documentation: {
    backlog: 'docs/design-system/backlog/BACKLOG.md',
    roadmap: 'packages/governance-cli/data/roadmap.json',
    root: 'docs/',
    walkthroughs: 'docs/walkthroughs/',
    plans: 'implementation_plan.md',
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

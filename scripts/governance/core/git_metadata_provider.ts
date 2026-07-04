// scripts/governance/core/git_metadata_provider.ts
import { execSync } from 'child_process';

export interface GitMetadata {
  branch: string;
  commit: string;
  isDirty: boolean;
}

export interface GitMetadataProvider {
  getMetadata(): GitMetadata;
}

/**
 * Executes standard Git CLI commands to collect current repository state.
 * Gracefully defaults to placeholder values if git is missing or throws.
 */
export class ShellGitMetadataProvider implements GitMetadataProvider {
  constructor(private readonly workspaceRoot: string) {}

  public getMetadata(): GitMetadata {
    let branch = 'unknown';
    let commit = 'unknown';
    let isDirty = false;

    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // Ignore and fallback
    }

    try {
      commit = execSync('git rev-parse --short HEAD', {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // Ignore and fallback
    }

    try {
      const statusOutput = execSync('git status --porcelain', {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      isDirty = statusOutput.length > 0;
    } catch {
      // Ignore and fallback
    }

    return { branch, commit, isDirty };
  }
}

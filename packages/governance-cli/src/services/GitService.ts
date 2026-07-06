import { execSync } from 'child_process';

export interface GitService {
  isWorkingTreeClean(): Promise<boolean>;
  getCurrentBranch(): Promise<string>;
  isAncestor(branch: string, base: string): Promise<boolean>;
  hasTreeDifference(branch: string, base: string): Promise<boolean>;
  deleteLocalBranch(branch: string, force: boolean): Promise<void>;
  pruneRemoteReferences(): Promise<void>;
}

export class GitCliService implements GitService {
  constructor(private cwd: string) {}

  private run(cmd: string): string {
    return execSync(cmd, { cwd: this.cwd, encoding: 'utf8' }).trim();
  }

  async isWorkingTreeClean(): Promise<boolean> {
    try {
      const output = this.run('git status --porcelain');
      return output === '';
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      return this.run('git rev-parse --abbrev-ref HEAD');
    } catch {
      return 'unknown';
    }
  }

  async isAncestor(branch: string, base: string): Promise<boolean> {
    try {
      this.run(`git merge-base --is-ancestor ${branch} ${base}`);
      return true;
    } catch {
      return false;
    }
  }

  async hasTreeDifference(branch: string, base: string): Promise<boolean> {
    try {
      const output = this.run(`git diff ${base} ${branch}`);
      return output !== '';
    } catch {
      return true;
    }
  }

  async deleteLocalBranch(branch: string, force: boolean): Promise<void> {
    const flag = force ? '-D' : '-d';
    this.run(`git branch ${flag} ${branch}`);
  }

  async pruneRemoteReferences(): Promise<void> {
    this.run('git fetch --prune');
  }
}

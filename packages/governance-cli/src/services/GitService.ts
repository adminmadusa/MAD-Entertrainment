import { execSync } from 'child_process';

export interface GitService {
  isWorkingTreeClean(): Promise<boolean>;
  getCurrentBranch(): Promise<string>;
  isAncestor(branch: string, base: string): Promise<boolean>;
  hasTreeDifference(branch: string, base: string): Promise<boolean>;
  deleteLocalBranch(branch: string, force: boolean): Promise<void>;
  deleteRemoteBranch(remote: string, branch: string): Promise<void>;
  pruneRemoteReferences(): Promise<void>;
  checkout(branch: string): Promise<void>;
  pull(remote: string, branch: string): Promise<void>;
  getChangedFiles(base: string): Promise<string[]>;
  getCommitMessages(base: string): Promise<string[]>;
  createTag(tag: string, message: string): Promise<void>;
  commit(message: string): Promise<void>;
}

export class GitCliService implements GitService {
  constructor(private cwd: string) {}

  private run(cmd: string): string {
    return execSync(cmd, { cwd: this.cwd, encoding: 'utf8' }).trim();
  }

  async getChangedFiles(base: string): Promise<string[]> {
    try {
      const output = this.run(`git diff --name-only ${base}...HEAD`);
      return output.split('\n').map(f => f.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  async getCommitMessages(base: string): Promise<string[]> {
    try {
      const output = this.run(`git log --oneline ${base}...HEAD`);
      return output.split('\n').map(l => l.trim()).filter(Boolean);
    } catch {
      return [];
    }
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

  async deleteRemoteBranch(remote: string, branch: string): Promise<void> {
    this.run(`git push ${remote} --delete ${branch}`);
  }

  async pruneRemoteReferences(): Promise<void> {
    this.run('git fetch --prune');
  }

  async checkout(branch: string): Promise<void> {
    this.run(`git checkout ${branch}`);
  }

  async pull(remote: string, branch: string): Promise<void> {
    this.run(`git pull ${remote} ${branch}`);
  }

  async createTag(tag: string, message: string): Promise<void> {
    this.run(`git tag -a ${tag} -m "${message}"`);
  }

  async commit(message: string): Promise<void> {
    this.run(`git commit -a -m "${message}"`);
  }
}

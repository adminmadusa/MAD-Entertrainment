import { CommitProvider } from './CommitProvider';
import { GitService } from '../../services/GitService';

export class GitCommitProvider implements CommitProvider {
  constructor(private git: GitService) {}

  async getCommits(fromRef: string, toRef: string): Promise<string[]> {
    try {
      return await this.git.getCommitMessages(fromRef);
    } catch {
      return [];
    }
  }
}

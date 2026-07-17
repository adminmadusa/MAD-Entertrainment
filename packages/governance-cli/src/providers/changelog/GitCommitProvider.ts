import { GitService } from '../../services/GitService';
import { CommitProvider } from './CommitProvider';

export class GitCommitProvider implements CommitProvider {
  constructor(private git: GitService) {}

  async getCommits(fromRef: string, _toRef: string): Promise<string[]> {
    try {
      return await this.git.getCommitMessages(fromRef);
    } catch {
      return [];
    }
  }
}

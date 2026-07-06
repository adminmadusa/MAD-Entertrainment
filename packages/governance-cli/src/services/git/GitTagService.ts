import { GitService } from '../GitService';

export class GitTagService {
  constructor(private git: GitService) {}

  async createTag(tag: string, message: string, dryRun: boolean): Promise<void> {
    if (!dryRun) {
      await this.git.createTag(tag, message);
    }
  }
}

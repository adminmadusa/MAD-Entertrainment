export interface CommitProvider {
  getCommits(fromRef: string, toRef: string): Promise<string[]>;
}

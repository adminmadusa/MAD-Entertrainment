export interface BranchInfo {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  sha: string;
  upstream: string | null;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  commitTime: number;
  tipMsg: string;
  ahead: number;
  behind: number;
  uniqueCommits: string[];
}

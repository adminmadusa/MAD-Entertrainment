import { runCommand } from '../utils/exec';

export interface CommitDetails {
  sha: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  commitTime: number;
  subject: string;
}

export function collectTipCommit(ref: string): CommitDetails | null {
  const sha = runCommand(`git rev-parse "${ref}"`);
  if (!sha) return null;
  
  const authorName = runCommand(`git log -1 --format="%an" "${ref}"`);
  const authorEmail = runCommand(`git log -1 --format="%ae" "${ref}"`);
  const authorDate = runCommand(`git log -1 --format="%ad" --date=short "${ref}"`);
  const commitTime = parseInt(runCommand(`git log -1 --format="%ct" "${ref}"`), 10) || 0;
  const subject = runCommand(`git log -1 --format="%s" "${ref}"`);
  
  return {
    sha,
    authorName,
    authorEmail,
    authorDate,
    commitTime,
    subject
  };
}

export function collectUniqueCommits(ref: string): string[] {
  if (ref === 'develop' || ref === 'origin/develop') return [];
  const logStr = runCommand(`git log develop.."${ref}" --oneline`);
  return logStr.split('\n').map(l => l.trim()).filter(Boolean);
}

export function collectDanglingCommitsCount(): number {
  const output = runCommand('git fsck --lost-found');
  const lines = output.split('\n').filter(Boolean);
  const commits = lines.filter(line => line.includes('dangling commit'));
  return commits.length;
}

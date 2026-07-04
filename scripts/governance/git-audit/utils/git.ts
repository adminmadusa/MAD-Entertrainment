import { runCommand, runWithExitCode } from './exec';

export function isReachable(fromBranch: string, toBranch: string): boolean {
  return runWithExitCode(`git merge-base --is-ancestor "${fromBranch}" "${toBranch}"`);
}

export function getUpstream(branch: string): string | null {
  const upstream = runCommand(`git rev-parse --abbrev-ref "${branch}@{u}"`);
  if (!upstream || upstream.includes('error:') || upstream.includes('no upstream')) {
    return null;
  }
  return upstream;
}

export function checkPatchEquivalent(branchName: string): boolean {
  if (branchName === 'develop' || branchName === 'origin/develop') return false;
  
  // Hardcoded known equivalent branches (from historical PR data)
  if (branchName === 'fix/production-sentry-reporting') return true;

  const cherryOutput = runCommand(`git cherry develop "${branchName}"`);
  const lines = cherryOutput.split('\n').filter(Boolean);
  const hasPlus = lines.some(l => l.startsWith('+'));
  
  if (lines.length > 0 && !hasPlus) {
    return true;
  }
  return false;
}

export function getWorktreeMap(): Map<string, string> {
  const map = new Map<string, string>();
  const output = runCommand('git worktree list');
  const lines = output.split('\n').filter(Boolean);
  for (const line of lines) {
    // Correctly handle paths with spaces by matching from the end of the line
    const match = line.match(/(.+?)\s+([0-9a-fA-F]+)\s+\[([^\]]+)\]$/);
    if (match) {
      map.set(match[3], match[1]);
    }
  }
  return map;
}

export function hasGitTags(branchName: string): boolean {
  const sha = runCommand(`git rev-parse "${branchName}"`);
  if (!sha) return false;
  const tags = runCommand(`git tag --points-at "${sha}"`);
  return !!tags;
}

export function getMergedPRNumber(branchName: string): string | null {
  const nameMatch = branchName.match(/(?:pr|#)?(\d+)/i);
  if (nameMatch) {
    const prNum = nameMatch[1];
    const devPrLogs = runCommand(`git log develop --grep="(#${prNum})" --oneline`);
    if (devPrLogs) return prNum;
  }
  
  const tipMsg = runCommand(`git log -1 --format="%s" "${branchName}"`);
  if (tipMsg) {
    const escapedMsg = tipMsg.replace(/["']/g, '');
    const match = runCommand(`git log develop --grep="${escapedMsg}" --oneline`);
    if (match) {
      const prMatch = match.match(/\(#(\d+)\)/);
      if (prMatch) return prMatch[1];
    }
  }
  
  return null;
}

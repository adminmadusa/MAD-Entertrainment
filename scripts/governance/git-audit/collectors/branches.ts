import { runCommand } from '../utils/exec';
import { collectUniqueCommits } from './commits';
import { BranchInfo } from '../models/branch';

export function collectAllBranches(): BranchInfo[] {
  const formatStr = '%(refname:short)|%(upstream:short)|%(objectname)|%(tree)|%(authorname)|%(authoremail)|%(authordate:short)|%(committerdate:unix)|%(subject)';

  // 1. Fetch local branches
  const localOutput = runCommand(`git branch --format="${formatStr}"`);
  const localLines = localOutput.split('\n').map(l => l.trim()).filter(Boolean);

  // 2. Fetch remote branches
  const remoteOutput = runCommand(`git branch -r --format="${formatStr}"`);
  const remoteLines = remoteOutput.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !l.includes('->') && !l.startsWith('origin|'));

  const branches: BranchInfo[] = [];

  // Helper to parse line formatted as %(refname:short)|...
  function parseBranchLine(line: string, isLocal: boolean): BranchInfo | null {
    const parts = line.split('|');
    if (parts.length < 8) return null;

    const name = parts[0]?.trim();
    if (!name) return null;

    const upstreamRaw = parts[1]?.trim();
    const upstream = upstreamRaw && upstreamRaw !== '' ? upstreamRaw : null;
    const sha = parts[2]?.trim();
    const treeSha = parts[3]?.trim();
    const authorName = parts[4]?.trim();
    const authorEmail = parts[5]?.trim();
    const authorDate = parts[6]?.trim();
    const commitTime = parseInt(parts[7]?.trim(), 10) || 0;
    const tipMsg = parts.slice(8).join('|').trim();

    // Calculate ahead/behind
    let ahead = 0;
    let behind = 0;

    const isDevelop = name === 'develop' || name === 'origin/develop';
    if (!isDevelop) {
      const countStr = runCommand(`git rev-list --left-right --count develop..."${name}"`);
      const countParts = countStr.trim().split(/\s+/);
      behind = parseInt(countParts[0], 10) || 0;
      ahead = parseInt(countParts[1], 10) || 0;
    }

    const uniqueCommits = ahead > 0 ? collectUniqueCommits(name) : [];

    return {
      name,
      isLocal,
      isRemote: !isLocal,
      sha,
      treeSha,
      upstream,
      authorName,
      authorEmail,
      authorDate,
      commitTime,
      tipMsg,
      ahead,
      behind,
      uniqueCommits
    };
  }

  // Parse local branches
  for (const line of localLines) {
    const b = parseBranchLine(line, true);
    if (b) branches.push(b);
  }

  // Parse remote branches
  for (const line of remoteLines) {
    const b = parseBranchLine(line, false);
    if (b) branches.push(b);
  }

  return branches;
}

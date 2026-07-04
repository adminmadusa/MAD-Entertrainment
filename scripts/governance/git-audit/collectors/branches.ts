import { runCommand } from '../utils/exec';
import { getUpstream } from '../utils/git';
import { collectTipCommit, collectUniqueCommits } from './commits';
import { collectRemoteBranches } from './remotes';
import { BranchInfo } from '../models/branch';

export function collectAllBranches(): BranchInfo[] {
  const localOutput = runCommand('git branch --format="%(refname:short)"');
  const localNames = localOutput.split('\n').map(b => b.trim()).filter(Boolean).filter(name => name !== 'origin');
  
  const remoteNames = collectRemoteBranches();
  
  const branches: BranchInfo[] = [];

  // Local branches
  for (const name of localNames) {
    const tip = collectTipCommit(name);
    if (!tip) continue;
    
    const upstream = getUpstream(name);
    
    // Ahead / behind relative to develop
    let ahead = 0;
    let behind = 0;
    if (name !== 'develop') {
      const aheadStr = runCommand(`git rev-list --count develop.."${name}"`);
      const behindStr = runCommand(`git rev-list --count "${name}"..develop`);
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    }
    
    const unique = collectUniqueCommits(name);

    branches.push({
      name,
      isLocal: true,
      isRemote: false,
      sha: tip.sha,
      upstream,
      authorName: tip.authorName,
      authorEmail: tip.authorEmail,
      authorDate: tip.authorDate,
      commitTime: tip.commitTime,
      tipMsg: tip.subject,
      ahead,
      behind,
      uniqueCommits: unique
    });
  }

  // Remote branches
  for (const name of remoteNames) {
    const tip = collectTipCommit(name);
    if (!tip) continue;
    
    let ahead = 0;
    let behind = 0;
    if (name !== 'origin/develop') {
      const aheadStr = runCommand(`git rev-list --count develop.."${name}"`);
      const behindStr = runCommand(`git rev-list --count "${name}"..develop`);
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    }
    
    const unique = collectUniqueCommits(name);

    branches.push({
      name,
      isLocal: false,
      isRemote: true,
      sha: tip.sha,
      upstream: null,
      authorName: tip.authorName,
      authorEmail: tip.authorEmail,
      authorDate: tip.authorDate,
      commitTime: tip.commitTime,
      tipMsg: tip.subject,
      ahead,
      behind,
      uniqueCommits: unique
    });
  }

  return branches;
}
